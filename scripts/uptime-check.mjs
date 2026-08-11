function baseUrl(envValue) {
  return envValue ? envValue.replace(/\/+$/, '') : null
}

const apiUrl = baseUrl(process.env.PUBLIC_API_URL)
const supabaseUrl = baseUrl(process.env.SUPABASE_URL)
const supabaseKey = process.env.SUPABASE_ANON_KEY

const targets = []
if (apiUrl) {
  targets.push({ name: 'api', url: `${apiUrl}/api/health` })
}
if (supabaseUrl) {
  targets.push({
    name: 'supabase',
    url: `${supabaseUrl}/auth/v1/health`,
    headers: supabaseKey ? { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } : undefined,
    anyStatusOk: !supabaseKey,
  })
}

if (targets.length === 0) {
  console.log('Uptime check skipped: set PUBLIC_API_URL and/or SUPABASE_URL.')
  process.exitCode = 0
}

function fetchWithTimeout(url, headers, ms) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  return fetch(url, { headers, signal: controller.signal }).finally(() => clearTimeout(timer))
}

const failed = []

for (const target of targets) {
  const start = Date.now()
  try {
    const res = await fetchWithTimeout(target.url, target.headers, 10_000)
    const ok = target.anyStatusOk ? res.status < 500 : res.ok
    if (ok) {
      // Extra gate for the API: the service-role key must be valid, otherwise
      // admin routes silently 500 and the app is effectively broken.
      if (target.name === 'api') {
        let body = null
        try { body = await res.json() } catch { /* not json */ }
        if (body && body.serviceRoleOk === false) {
          console.log(`WARN ${Date.now() - start}ms ${target.url} (HTTP ${res.status} but serviceRoleOk=false — rotate the Supabase service_role key)`)
          failed.push(`${target.name} (serviceRoleOk=false — rotate the Supabase service_role key)`)
          continue
        }
      }
      console.log(`OK   ${Date.now() - start}ms ${target.url}`)
    } else {
      console.log(`DOWN ${Date.now() - start}ms ${target.url} (HTTP ${res.status})`)
      failed.push(`${target.name} (${target.url} -> HTTP ${res.status})`)
    }
  } catch (err) {
    console.log(`DOWN ${Date.now() - start}ms ${target.url} (${err.message})`)
    failed.push(`${target.name} (${target.url})`)
  }
}

if (failed.length > 0) {
  console.error(`Unhealthy endpoints: ${failed.join('; ')}`)
  process.exitCode = 1
} else {
  console.log('All health checks passed.')
}