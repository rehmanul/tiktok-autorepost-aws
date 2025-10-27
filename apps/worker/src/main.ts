import { PutObjectCommand, GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import { request as httpRequest } from 'undici';
import http from 'node:http';
import { google } from 'googleapis';
import { TwitterApi } from 'twitter-api-v2';
import { Queue, QueueEvents, Worker } from 'bullmq';
import IORedis from 'ioredis';
import pino from 'pino';
import {
  collectDefaultMetrics,
  Counter,
  Gauge,
  Histogram,
  register
} from 'prom-client';
import {
  ConnectionStatus,
  JobKind,
  JobStatus,
  Prisma,
  PrismaClient,
  RepostStatus,
  SocialPlatform
} from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { TikTokHttpClient } from '@autorepost/integrations-tiktok';
import { QUEUES, createTokenCipher } from '@autorepost/common';

const shouldUsePrettyLogs = (() => {
  const nodeEnv = (process.env.NODE_ENV ?? '').toLowerCase();
  if (nodeEnv !== 'development') {
    return false;
  }
  try {
    require.resolve('pino-pretty');
    return true;
  } catch {
    return false;
  }
})();

const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  transport: shouldUsePrettyLogs
    ? {
        target: 'pino-pretty',
        options: { colorize: true }
      }
    : undefined
});

let tokenCipher = createCipher();

const metricsPort = (() => {
  const raw = process.env.METRICS_PORT;
  if (!raw) {
    return undefined;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
})();
const metricsHost = process.env.METRICS_HOST ?? '0.0.0.0';

collectDefaultMetrics({
  register,
  labels: { service: 'worker' }
});

const jobCompletedCounter = new Counter({
  name: 'worker_jobs_completed_total',
  help: 'Total number of completed jobs',
  labelNames: ['kind']
});
const jobFailedCounter = new Counter({
  name: 'worker_jobs_failed_total',
  help: 'Total number of failed jobs',
  labelNames: ['kind']
});
const jobDurationHistogram = new Histogram({
  name: 'worker_job_duration_seconds',
  help: 'Processing job duration in seconds',
  labelNames: ['kind'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60]
});
const syncDurationHistogram = new Histogram({
  name: 'tiktok_sync_duration_seconds',
  help: 'Duration of TikTok sync operations',
  buckets: [5, 10, 20, 40, 60, 120, 240]
});
const queueDepthGauge = new Gauge({
  name: 'worker_queue_waiting_jobs',
  help: 'Number of jobs waiting in the repost dispatch queue'
});
queueDepthGauge.set(0);

let metricsServer: http.Server | undefined;
let queueMetricsInterval: NodeJS.Timeout | undefined;

if (metricsPort) {
  metricsServer = http.createServer(async (req, res) => {
    if (req.url === '/metrics') {
      try {
        const metrics = await register.metrics();
        res.writeHead(200, { 'content-type': register.contentType });
        res.end(metrics);
      } catch (error) {
        logger.error({ err: error }, 'Failed to collect metrics');
        res.writeHead(500).end('metrics collection error');
      }
      return;
    }

    res.writeHead(404).end();
  });

  metricsServer.listen(metricsPort, metricsHost, () => {
    logger.info(
      { port: metricsPort, host: metricsHost },
      'Metrics server listening'
    );
  });
}

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
const redisTls = (process.env.REDIS_TLS ?? 'false').toLowerCase() === 'true';

const redis = new IORedis(redisUrl, {
  tls: redisTls ? {} : undefined,
  maxRetriesPerRequest: null
});

const queueEvents = new QueueEvents(QUEUES.REPOST_DISPATCH, {
  connection: redis.duplicate()
});

const queue = new Queue(QUEUES.REPOST_DISPATCH, {
  connection: redis.duplicate()
});

const updateQueueMetrics = () => {
  queue
    .getWaitingCount()
    .then((count) => queueDepthGauge.set(count))
    .catch((error) =>
      logger.warn({ err: error }, 'Failed to update queue backlog metric')
    );
};

queueEvents.on('waiting', updateQueueMetrics);
queueEvents.on('active', updateQueueMetrics);
queueEvents.on('completed', updateQueueMetrics);
queueEvents.on('failed', updateQueueMetrics);

const pollIntervalRaw = process.env.METRICS_POLL_INTERVAL ?? '15000';
const metricsPollInterval = Number.parseInt(pollIntervalRaw, 10);
if (!Number.isNaN(metricsPollInterval) && metricsPollInterval > 0) {
  queueMetricsInterval = setInterval(updateQueueMetrics, metricsPollInterval);
}
updateQueueMetrics();

const prisma = new PrismaClient();

const s3Client = new S3Client({
  region: process.env.S3_REGION ?? 'us-east-1',
  endpoint: process.env.S3_ENDPOINT,
  forcePathStyle: (process.env.S3_FORCE_PATH_STYLE ?? 'false').toLowerCase() === 'true',
  credentials: process.env.S3_ACCESS_KEY_ID
    ? {
        accessKeyId: process.env.S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? ''
      }
    : undefined
});

const s3Bucket = process.env.S3_BUCKET ?? 'autorepost-media';

const tikTokClient = new TikTokHttpClient({
  defaultCookies: process.env.TIKTOK_COOKIE
});

type JobHandler = (processingJobId: string) => Promise<Record<string, unknown> | null>;

const jobProcessors: Partial<Record<JobKind, JobHandler>> = {
  TIKTOK_SYNC: syncTikTokAccount,
  REPOST_PREP: prepareRepostPayload,
  REPOST_PUBLISH: publishToDestination,
  TOKEN_REFRESH: refreshOAuthToken
};

interface ScheduleJobInput {
  tenantId: string;
  userId: string;
  kind: JobKind;
  ruleId?: string;
  postLogId?: string;
  sourceConnectionId?: string;
  destinationConnectionId?: string;
  priority?: number;
  payload?: Prisma.InputJsonValue;
}

async function syncTikTokAccount(processingJobId: string): Promise<Record<string, unknown>> {
  const stopSyncTimer = syncDurationHistogram.startTimer();
  try {
    const job = await prisma.processingJob.findUniqueOrThrow({
      where: { id: processingJobId },
      include: {
        tenant: true,
        user: true,
        sourceConnection: true
      }
    });

    if (!job.sourceConnection) {
      throw new Error(`Source connection not found for job ${processingJobId}`);
    }

    const sourceConnection = job.sourceConnection;

    const rules = await prisma.autoPostRule.findMany({
      where: {
        tenantId: job.tenantId,
        sourceConnectionId: job.sourceConnectionId ?? undefined,
        isActive: true
      },
      include: {
        destinations: {
          include: {
            connection: true
          }
        }
      }
    });

    if (!rules.length) {
      await prisma.connection.update({
        where: { id: sourceConnection.id },
        data: {
          lastSyncedAt: new Date(),
          metadata: clearConnectionErrorMetadata(sourceConnection.metadata)
        }
      });

      return {
        fetchedPosts: 0,
        newPosts: 0,
        rules: 0
      };
    }

    const cookies = decrypt(sourceConnection.accessTokenEncrypted);
    const feed = await tikTokClient.fetchUserFeed({
      username: sourceConnection.accountHandle,
      page: 1,
      perPage: 50,
      cookies
    });

    let createdPosts = 0;

    for (const rule of rules) {
      for (const video of feed.videos) {
        try {
          const postLog = await prisma.postLog.create({
            data: {
              tenantId: job.tenantId,
              userId: job.userId,
              ruleId: rule.id,
              sourceConnectionId: sourceConnection.id,
              tiktokPostId: video.videoId,
              tiktokUrl: video.url,
              caption: video.description,
              sourceVideoUrl: video.downloadUrl ?? video.playbackUrl ?? null,
              thumbnailUrl: video.thumbnailUrl,
              durationSeconds: video.durationSeconds ?? null,
              sourcePublishedAt: new Date(video.epochTimePosted * 1000),
              metadata: {
                playbackUrl: video.playbackUrl,
                downloadUrl: video.downloadUrl,
                likes: video.likes,
                views: video.views
              }
            }
          });

          createdPosts += 1;

          await scheduleProcessingJob({
            tenantId: job.tenantId,
            userId: job.userId,
            kind: JobKind.REPOST_PREP,
            ruleId: rule.id,
            postLogId: postLog.id,
            sourceConnectionId: sourceConnection.id,
            payload: {
              sourceVideoUrl: postLog.sourceVideoUrl
            }
          });
        } catch (error) {
          if (isUniqueConstraintError(error)) {
            continue;
          }
          throw error;
        }
      }
    }

    await prisma.connection.update({
      where: { id: sourceConnection.id },
      data: {
        lastSyncedAt: new Date(),
        status: ConnectionStatus.ACTIVE,
        metadata: clearConnectionErrorMetadata(sourceConnection.metadata)
      }
    });

    return {
      fetchedPosts: feed.videos.length,
      newPosts: createdPosts,
      rules: rules.length
    };
  } finally {
    stopSyncTimer();
  }
}

async function prepareRepostPayload(processingJobId: string): Promise<Record<string, unknown>> {
  const job = await prisma.processingJob.findUniqueOrThrow({
    where: { id: processingJobId },
    include: {
      postLog: true,
      rule: {
        include: {
          destinations: {
            include: {
              connection: true
            }
          }
        }
      },
      sourceConnection: true
    }
  });

  if (!job.postLog) {
    throw new Error(`Post log missing for job ${processingJobId}`);
  }

  if (!job.rule) {
    throw new Error(`Rule missing for job ${processingJobId}`);
  }

  const postLog = job.postLog;

  let uploaded = false;
  if (!postLog.mediaStorageKey) {
    if (!postLog.sourceVideoUrl) {
      throw new Error(`Post ${postLog.id} has no source video URL to download`);
    }
    const cookies = job.sourceConnection ? decrypt(job.sourceConnection.accessTokenEncrypted) : undefined;
    const videoBuffer = await downloadBinary(postLog.sourceVideoUrl, cookies);
    const sha = createHash('sha256').update(videoBuffer).digest('hex');
    const key = `tenants/${postLog.tenantId}/posts/${postLog.id}.mp4`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: s3Bucket,
        Key: key,
        Body: videoBuffer,
        ContentType: 'video/mp4'
      })
    );

    await prisma.postLog.update({
      where: { id: postLog.id },
      data: {
        mediaStorageKey: key,
        mediaSha256: sha
      }
    });

    uploaded = true;
  }

  let scheduledDestinations = 0;

  for (const destination of job.rule.destinations) {
    const activity = await prisma.repostActivity.upsert({
      where: {
        postLogId_destinationId: {
          postLogId: postLog.id,
          destinationId: destination.id
        }
      },
      update: {},
      create: {
        postLogId: postLog.id,
        destinationId: destination.id,
        platform: destination.connection.platform,
        status: RepostStatus.PENDING
      }
    });

    if (activity.status === RepostStatus.SUCCEEDED) {
      continue;
    }

    await scheduleProcessingJob({
      tenantId: job.tenantId,
      userId: job.userId,
      kind: JobKind.REPOST_PUBLISH,
      ruleId: job.rule.id,
      postLogId: postLog.id,
      destinationConnectionId: destination.connectionId,
      payload: {
        destinationId: destination.id
      }
    });

    scheduledDestinations += 1;
  }

  return {
    uploaded,
    scheduledDestinations
  };
}

async function publishToDestination(processingJobId: string): Promise<Record<string, unknown>> {
  const job = await prisma.processingJob.findUniqueOrThrow({
    where: { id: processingJobId },
    include: {
      destinationConnection: true,
      postLog: true
    }
  });

  if (!job.postLog) {
    throw new Error(`Post log missing for job ${processingJobId}`);
  }

  if (!job.destinationConnection) {
    throw new Error(`Destination connection missing for job ${processingJobId}`);
  }

  if (!job.destinationConnectionId) {
    throw new Error(`Job ${processingJobId} missing destination connection identifier`);
  }

  const payload = (job.payload ?? {}) as { destinationId?: string };
  if (!payload.destinationId) {
    throw new Error(`Job ${processingJobId} missing destination identifier`);
  }

  const repostActivity = await prisma.repostActivity.findUniqueOrThrow({
    where: {
      postLogId_destinationId: {
        postLogId: job.postLogId!,
        destinationId: payload.destinationId
      }
    }
  });

  if (!job.postLog.mediaStorageKey) {
    throw new Error(`Post ${job.postLogId} has no stored media key`);
  }

  const destinationConnection = job.destinationConnection;
  const accessToken = decryptStrict(
    destinationConnection.accessTokenEncrypted,
    `Destination connection ${destinationConnection.id} missing access token`
  );
  const refreshToken = decrypt(destinationConnection.refreshTokenEncrypted);

  await prisma.repostActivity.update({
    where: { id: repostActivity.id },
    data: {
      status: RepostStatus.IN_PROGRESS,
      attemptCount: { increment: 1 },
      startedAt: new Date(),
      errorMessage: null
    }
  });

  try {
    const signedUrl = await getSignedUrl(
      s3Client,
      new GetObjectCommand({
        Bucket: s3Bucket,
        Key: job.postLog.mediaStorageKey
      }),
      { expiresIn: 3600 }
    );

    let result: { url?: string } = {};

    switch (destinationConnection.platform) {
      case SocialPlatform.INSTAGRAM:
        result = await publishInstagramReel({
          accessToken,
          mediaUrl: signedUrl,
          caption: job.postLog.caption,
          metadata: destinationConnection.metadata,
          handle: destinationConnection.accountHandle
        });
        break;
      case SocialPlatform.YOUTUBE:
        result = await publishYouTubeShort({
          accessToken,
          refreshToken,
          connectionMetadata: destinationConnection.metadata,
          postLog: job.postLog
        });
        break;
      case SocialPlatform.TWITTER:
        result = await publishTwitterVideo({
          connectionMetadata: destinationConnection.metadata,
          accessToken,
          accessSecret: refreshToken,
          postLog: job.postLog,
          accountHandle: destinationConnection.accountHandle
        });
        break;
      default:
        throw new Error(`Unsupported destination platform ${destinationConnection.platform}`);
    }

    await prisma.repostActivity.update({
      where: { id: repostActivity.id },
      data: {
        status: RepostStatus.SUCCEEDED,
        repostUrl: result.url ?? null,
        completedAt: new Date(),
        metadata: {
          destinationConnectionId: destinationConnection.id
        } as Prisma.InputJsonValue
      }
    });

    return {
      platform: destinationConnection.platform,
      repostUrl: result.url ?? null
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await prisma.repostActivity.update({
      where: { id: repostActivity.id },
      data: {
        status: RepostStatus.FAILED,
        errorMessage: message,
        completedAt: new Date()
      }
    });
    throw error;
  }
}

async function refreshOAuthToken(processingJobId: string): Promise<Record<string, unknown>> {
  const job = await prisma.processingJob.findUniqueOrThrow({
    where: { id: processingJobId },
    include: {
      destinationConnection: true,
      sourceConnection: true
    }
  });

  const connection = job.destinationConnection ?? job.sourceConnection;
  if (!connection) {
    throw new Error(`No connection attached to refresh job ${processingJobId}`);
  }

  switch (connection.platform) {
    case SocialPlatform.INSTAGRAM:
      return refreshInstagramToken(connection);
    case SocialPlatform.YOUTUBE:
      return refreshYouTubeToken(connection);
    default:
      return {
        platform: connection.platform,
        skipped: true,
        reason: 'Automatic refresh not implemented for this platform'
      };
  }
}

async function scheduleProcessingJob(input: ScheduleJobInput) {
  const jobRecord = await prisma.processingJob.create({
    data: {
      tenantId: input.tenantId,
      userId: input.userId,
      ruleId: input.ruleId,
      postLogId: input.postLogId,
      sourceConnectionId: input.sourceConnectionId,
      destinationConnectionId: input.destinationConnectionId,
      kind: input.kind,
      status: JobStatus.PENDING,
      payload: input.payload ?? Prisma.JsonNull,
      priority: input.priority ?? 0
    }
  });

  await queue.add(
    input.kind,
    {
      processingJobId: jobRecord.id
    },
    {
      jobId: jobRecord.id,
      priority: input.priority ?? 0
    }
  );

  await prisma.processingJob.update({
    where: { id: jobRecord.id },
    data: {
      status: JobStatus.SCHEDULED,
      scheduledFor: new Date()
    }
  });

  return jobRecord;
}

async function publishInstagramReel(params: {
  accessToken: string;
  mediaUrl: string;
  caption: string;
  metadata: Prisma.JsonValue | null;
  handle?: string | null;
}) {
  const metadata = (params.metadata as Record<string, unknown> | null) ?? {};
  const igBusinessAccountId =
    (metadata.instagramBusinessAccountId as string | undefined) ??
    (metadata.igBusinessAccountId as string | undefined) ??
    (metadata.businessAccountId as string | undefined) ??
    null;

  if (!igBusinessAccountId) {
    throw new Error('Instagram connection missing business account id (instagramBusinessAccountId)');
  }

  const creation: any = await graphPost(`/v19.0/${igBusinessAccountId}/media`, params.accessToken, {
    media_type: 'REELS',
    caption: params.caption,
    video_url: params.mediaUrl
  });

  if (!creation?.id) {
    throw new Error('Failed to create Instagram media container');
  }

  await waitForInstagramContainer(creation.id, params.accessToken);

  const publishResult: any = await graphPost(
    `/v19.0/${igBusinessAccountId}/media_publish`,
    params.accessToken,
    {
      creation_id: creation.id
    }
  );

  const mediaId = publishResult?.id;
  if (!mediaId) {
    throw new Error('Instagram publish completed without returning media id');
  }

  const mediaDetails: any = await graphGet(`/${mediaId}`, params.accessToken, {
    fields: 'permalink'
  });

  return {
    url: mediaDetails?.permalink ?? null
  };
}

async function publishYouTubeShort(params: {
  accessToken: string;
  refreshToken?: string | null;
  connectionMetadata: Prisma.JsonValue | null;
  postLog: {
    id: string;
    caption: string;
    mediaStorageKey?: string | null;
  };
}) {
  if (!params.postLog.mediaStorageKey) {
    throw new Error('Post log missing media storage key for YouTube publish');
  }

  const metadata = (params.connectionMetadata as Record<string, unknown> | null) ?? {};
  const clientId = metadata.googleClientId as string | undefined;
  const clientSecret = metadata.googleClientSecret as string | undefined;
  const redirectUri =
    (metadata.googleRedirectUri as string | undefined) ?? 'urn:ietf:wg:oauth:2.0:oob';

  if (!clientId || !clientSecret) {
    throw new Error('YouTube connection missing googleClientId/googleClientSecret metadata');
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  oauth2Client.setCredentials({
    access_token: params.accessToken,
    refresh_token: params.refreshToken ?? undefined
  });

  const youtube = google.youtube({
    version: 'v3',
    auth: oauth2Client
  });

  const object = await s3Client.send(
    new GetObjectCommand({
      Bucket: s3Bucket,
      Key: params.postLog.mediaStorageKey
    })
  );

  if (!object.Body) {
    throw new Error('Unable to download video from storage for YouTube upload');
  }

  const bodyStream = object.Body as Readable;

  const response = await youtube.videos.insert({
    part: ['snippet', 'status'],
    requestBody: {
      snippet: {
        title: buildYouTubeTitle(params.postLog.caption),
        description: params.postLog.caption,
        categoryId: '22'
      },
      status: {
        privacyStatus: 'public',
        selfDeclaredMadeForKids: false
      }
    },
    media: {
      body: bodyStream,
      mimeType: object.ContentType ?? 'video/mp4'
    }
  });

  const videoId = response.data.id;
  if (!videoId) {
    throw new Error('YouTube response did not include a video id');
  }

  return {
    url: `https://www.youtube.com/watch?v=${videoId}`
  };
}

async function publishTwitterVideo(params: {
  connectionMetadata: Prisma.JsonValue | null;
  accessToken: string;
  accessSecret?: string | null;
  postLog: {
    id: string;
    caption: string;
    mediaStorageKey?: string | null;
  };
  accountHandle?: string | null;
}) {
  if (!params.postLog.mediaStorageKey) {
    throw new Error('Post log missing media storage key for Twitter publish');
  }

  const metadata = (params.connectionMetadata as Record<string, unknown> | null) ?? {};
  const consumerKey =
    (metadata.twitterConsumerKey as string | undefined) ?? (metadata.consumerKey as string | undefined);
  const consumerSecret =
    (metadata.twitterConsumerSecret as string | undefined) ??
    (metadata.consumerSecret as string | undefined);

  if (!consumerKey || !consumerSecret) {
    throw new Error('Twitter connection missing consumer key/secret metadata');
  }

  if (!params.accessSecret) {
    throw new Error('Twitter connection requires access token secret stored as refresh token');
  }

  const twitter = new TwitterApi({
    appKey: consumerKey,
    appSecret: consumerSecret,
    accessToken: params.accessToken,
    accessSecret: params.accessSecret
  });

  const object = await s3Client.send(
    new GetObjectCommand({
      Bucket: s3Bucket,
      Key: params.postLog.mediaStorageKey
    })
  );

  if (!object.Body) {
    throw new Error('Unable to download video from storage for Twitter upload');
  }

  const buffer = await streamToBuffer(object.Body as Readable);

  const mediaId = await twitter.v1.uploadMedia(buffer, {
    type: 'video/mp4'
  });

  const tweet = await twitter.v2.tweet({
    text: buildTweetText(params.postLog.caption),
    media: {
      media_ids: [mediaId]
    }
  });

  const tweetId = tweet.data.id;
  const tweetHandle = params.accountHandle?.replace(/^@/, '');

  return {
    url: tweetId && tweetHandle ? `https://twitter.com/${tweetHandle}/status/${tweetId}` : undefined
  };
}

async function refreshInstagramToken(connection: {
  id: string;
  accessTokenEncrypted: string;
  metadata: Prisma.JsonValue | null;
}) {
  const accessToken = decryptStrict(
    connection.accessTokenEncrypted,
    `Connection ${connection.id} missing Instagram access token`
  );
  const response: any = await graphGet('/v19.0/refresh_access_token', accessToken, {
    grant_type: 'ig_refresh_token'
  });

  if (!response?.access_token) {
    throw new Error('Instagram refresh token response did not include access_token');
  }

  await prisma.connection.update({
    where: { id: connection.id },
    data: {
      accessTokenEncrypted: tokenCipher.encrypt(response.access_token),
      expiresAt: response.expires_in ? new Date(Date.now() + Number(response.expires_in) * 1000) : null
    }
  });

  return {
    platform: SocialPlatform.INSTAGRAM,
    refreshed: true
  };
}

async function refreshYouTubeToken(connection: {
  id: string;
  accessTokenEncrypted: string;
  refreshTokenEncrypted: string | null;
  metadata: Prisma.JsonValue | null;
}) {
  if (!connection.refreshTokenEncrypted) {
    throw new Error('YouTube connection missing refresh token');
  }

  const metadata = (connection.metadata as Record<string, unknown> | null) ?? {};
  const clientId = metadata.googleClientId as string | undefined;
  const clientSecret = metadata.googleClientSecret as string | undefined;

  if (!clientId || !clientSecret) {
    throw new Error('YouTube connection missing googleClientId/googleClientSecret metadata');
  }

  const refreshToken = decrypt(connection.refreshTokenEncrypted);
  if (!refreshToken) {
    throw new Error(`YouTube connection ${connection.id} missing refresh token value`);
  }
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token'
  });

  const tokenResponse = await httpRequest('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  });

  if (tokenResponse.statusCode >= 400) {
    throw new Error(`Failed to refresh YouTube token (status ${tokenResponse.statusCode})`);
  }

  const payload: any = await tokenResponse.body.json();
  if (!payload?.access_token) {
    throw new Error('YouTube refresh response missing access_token');
  }

  await prisma.connection.update({
    where: { id: connection.id },
    data: {
      accessTokenEncrypted: tokenCipher.encrypt(payload.access_token),
      expiresAt: payload.expires_in ? new Date(Date.now() + Number(payload.expires_in) * 1000) : null
    }
  });

  return {
    platform: SocialPlatform.YOUTUBE,
    refreshed: true
  };
}

async function graphPost(path: string, accessToken: string, body: Record<string, unknown>): Promise<any> {
  const url = new URL(`https://graph.facebook.com${path}`);
  const params = new URLSearchParams({
    access_token: accessToken
  });
  Object.entries(body).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.set(key, String(value));
    }
  });

  const response = await httpRequest(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  });

  if (response.statusCode >= 400) {
    const errorBody = await response.body.text();
    throw new Error(`Graph API POST ${path} failed (${response.statusCode}): ${errorBody}`);
  }

  return response.body.json();
}

async function graphGet(path: string, accessToken: string, query: Record<string, unknown>): Promise<any> {
  const url = new URL(`https://graph.facebook.com${path}`);
  url.searchParams.set('access_token', accessToken);
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  });

  const response = await httpRequest(url, { method: 'GET' });

  if (response.statusCode >= 400) {
    const body = await response.body.text();
    throw new Error(`Graph API GET ${path} failed (${response.statusCode}): ${body}`);
  }

  return response.body.json();
}

async function waitForInstagramContainer(creationId: string, accessToken: string) {
  const maxAttempts = 20;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const status: any = await graphGet(`/${creationId}`, accessToken, {
      fields: 'status_code,status'
    });

    const code = status?.status_code ?? status?.status;
    if (code === 'FINISHED') {
      return;
    }

    if (code === 'ERROR' || code === 'FAILED') {
      throw new Error('Instagram media container failed to process');
    }

    await delay(1500);
  }

  throw new Error('Timed out waiting for Instagram media container to finish processing');
}

async function downloadBinary(url: string, cookies?: string) {
  const headers: Record<string, string> = {
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
  };
  if (cookies) {
    headers.cookie = cookies;
  }

  const response = await httpRequest(url, {
    method: 'GET',
    headers
  });

  if (response.statusCode >= 400) {
    throw new Error(`Failed to download media (${response.statusCode}) from ${url}`);
  }

  const arrayBuffer = await response.body.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

function decrypt(encrypted?: string | null): string | undefined {
  if (!encrypted) {
    return undefined;
  }
  return tokenCipher.decrypt(encrypted);
}

function decryptStrict(encrypted: string | null | undefined, context: string): string {
  const value = decrypt(encrypted);
  if (!value) {
    throw new Error(context);
  }
  return value;
}

function clearConnectionErrorMetadata(
  metadata: Prisma.JsonValue | null
): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (metadata === null || metadata === undefined) {
    return Prisma.JsonNull;
  }

  if (typeof metadata !== 'object') {
    return metadata as Prisma.InputJsonValue;
  }

  const clone = { ...(metadata as Record<string, unknown>) };
  delete clone.lastErrorMessage;
  delete clone.lastErrorAt;

  return Object.keys(clone).length ? (clone as Prisma.InputJsonValue) : Prisma.JsonNull;
}

function createCipher() {
  try {
    const key = process.env.TOKEN_ENCRYPTION_KEY ?? '';
    return createTokenCipher(key);
  } catch (error) {
    logger.fatal({ err: error }, 'Failed to initialise token cipher. Set TOKEN_ENCRYPTION_KEY.');
    process.exit(1);
  }
}

function isUniqueConstraintError(error: unknown) {
  return error instanceof PrismaClientKnownRequestError && error.code === 'P2002';
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function buildYouTubeTitle(caption: string) {
  if (!caption) {
    return 'TikTok Short';
  }
  const trimmed = caption.trim().replace(/\s+/g, ' ');
  return trimmed.length > 100 ? `${trimmed.slice(0, 97)}...` : trimmed;
}

function buildTweetText(caption: string) {
  if (!caption) {
    return 'New video posted via Autorepost Dashboard';
  }
  const trimmed = caption.trim();
  return trimmed.length > 280 ? `${trimmed.slice(0, 277)}...` : trimmed;
}

async function main() {
  logger.info('Starting repost pipeline worker');

  await queueEvents.waitUntilReady();

  queueEvents.on('waiting', ({ jobId }) => {
    logger.debug({ jobId }, 'Job waiting');
  });
  queueEvents.on('failed', ({ jobId, failedReason }) => {
    logger.error({ jobId, failedReason }, 'Job failed');
  });
  queueEvents.on('completed', ({ jobId }) => {
    logger.info({ jobId }, 'Job completed');
  });

  const concurrency = Number.parseInt(process.env.WORKER_CONCURRENCY ?? '2', 10);

  const worker = new Worker(
    QUEUES.REPOST_DISPATCH,
    async (job) => {
      const processingJobId = job.data.processingJobId as string;
      const kind = job.name as JobKind;
      const stopJobTimer = jobDurationHistogram.startTimer({ kind });

      logger.info({ processingJobId, kind }, 'Processing job started');

      await prisma.processingJob.update({
        where: { id: processingJobId },
        data: {
          status: JobStatus.RUNNING,
          startedAt: new Date(),
          attempts: {
            increment: 1
          }
        }
      });

      try {
        const handler = jobProcessors[kind];
        if (!handler) {
          throw new Error(`No processor registered for job kind ${kind}`);
        }

        const result = await handler(processingJobId);

        await prisma.processingJob.update({
          where: { id: processingJobId },
          data: {
            status: JobStatus.SUCCEEDED,
            completedAt: new Date(),
            result: result ? (result as Prisma.InputJsonValue) : Prisma.JsonNull
          }
        });

        logger.info({ processingJobId, kind }, 'Processing job succeeded');
        jobCompletedCounter.inc({ kind });
        stopJobTimer();
        updateQueueMetrics();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await prisma.processingJob.update({
          where: { id: processingJobId },
          data: {
            status: JobStatus.FAILED,
            completedAt: new Date(),
            error: {
              message,
              kind
            } as Prisma.InputJsonValue
          }
        });

        logger.error({ processingJobId, kind, message }, 'Processing job failed');
        jobFailedCounter.inc({ kind });
        stopJobTimer();
        updateQueueMetrics();
        throw error;
      }
    },
    {
      connection: redis,
      concurrency
    }
  );

  const gracefulShutdown = async () => {
    logger.info('Shutting down worker');
    await worker.close();
    await queue.close();
    await queueEvents.close();
    if (queueMetricsInterval) {
      clearInterval(queueMetricsInterval);
    }
    if (metricsServer) {
      await new Promise<void>((resolve) =>
        metricsServer.close(() => resolve())
      );
    }
    await prisma.$disconnect();
    await redis.quit();
    process.exit(0);
  };

  process.on('SIGINT', gracefulShutdown);
  process.on('SIGTERM', gracefulShutdown);
}

main().catch(async (error) => {
  logger.fatal({ err: error }, 'Worker failed to start');
  await prisma.$disconnect();
  await redis.quit();
  process.exit(1);
});
