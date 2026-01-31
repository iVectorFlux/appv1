/**
 * Health check endpoint for Vercel serverless backend.
 * Use for readiness checks and load balancers. Stateless; safe for concurrent users.
 */
export function GET() {
  return new Response(
    JSON.stringify({
      ok: true,
      service: 'eq-app',
      timestamp: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
