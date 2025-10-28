import { redirect } from 'next/navigation';

export default function TenantsRedirect() {
  redirect('/console/tenants');
}
