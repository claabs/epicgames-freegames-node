export async function getGCPExternalIP(): Promise<string> {
  const res = await fetch(
    'http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip',
    { headers: { 'Metadata-Flavor': 'Google' } }
  )
  return (await res.text()).trim()
}
