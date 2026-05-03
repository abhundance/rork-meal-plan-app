/**
 * join — Supabase Edge Function
 *
 * Serves an HTTPS invite URL that redirects to the mealplan:// deep link.
 * This allows invite links to be clickable in WhatsApp, iMessage, etc.
 * (messaging apps only render http/https as hyperlinks — custom schemes are not clickable).
 *
 * URL pattern: /functions/v1/join/{INVITE_CODE}
 * Deep link:   mealplan://join/{INVITE_CODE}
 *
 * Flow:
 *   1. Recipient taps HTTPS link in WhatsApp → opens in browser
 *   2. JS immediately tries window.location.href = 'mealplan://join/CODE'
 *   3. If app is installed → iOS/Android prompts to open Meal Plan → join screen
 *   4. If app is not installed → HTML page shows download CTA
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Extract invite code from path: /functions/v1/join/{code}
  const url = new URL(req.url);
  const segments = url.pathname.split('/').filter(Boolean);
  const code = segments[segments.length - 1];

  if (!code || code === 'join') {
    return new Response('Not found', { status: 404 });
  }

  const deepLink = `mealplan://join/${code.toUpperCase()}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Join Meal Plan</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 24px;
    }
    .card {
      text-align: center;
      max-width: 360px;
      width: 100%;
    }
    .icon {
      width: 72px;
      height: 72px;
      background: #FDEBED;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
      font-size: 32px;
    }
    h1 {
      font-size: 24px;
      font-weight: 700;
      color: #2C2C2C;
      margin-bottom: 10px;
    }
    p {
      font-size: 15px;
      color: #6B7280;
      line-height: 1.5;
      margin-bottom: 28px;
    }
    .btn {
      display: block;
      background: #E60023;
      color: #FFFFFF;
      border-radius: 12px;
      padding: 16px 24px;
      font-size: 16px;
      font-weight: 700;
      text-decoration: none;
      margin-bottom: 14px;
    }
    .code-box {
      background: #F8F8F8;
      border-radius: 10px;
      padding: 12px;
      font-size: 13px;
      color: #6B7280;
      margin-top: 8px;
    }
    .code {
      font-size: 18px;
      font-weight: 700;
      color: #2C2C2C;
      letter-spacing: 2px;
      margin-top: 4px;
    }
  </style>
  <script>
    // Attempt to open the app immediately
    window.location.href = '${deepLink}';
  </script>
</head>
<body>
  <div class="card">
    <div class="icon">🍽️</div>
    <h1>You've been invited!</h1>
    <p>Tap below to open the Meal Plan app and join the family meal plan.</p>
    <a class="btn" href="${deepLink}">Open Meal Plan App</a>
    <div class="code-box">
      Don't have the app yet? Download <strong>Meal Plan</strong> from the App Store, then enter your invite code:
      <div class="code">${code.toUpperCase()}</div>
    </div>
  </div>
</body>
</html>`;

  return new Response(html, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/html',
    },
  });
});
