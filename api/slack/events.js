const crypto = require('crypto');
const { sql, ensureSchema } = require('../../lib/schema');

const config = { api: { bodyParser: false } };

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function verifySlackSignature(req, rawBody) {
  const secret = process.env.SLACK_SIGNING_SECRET;
  const timestamp = req.headers['x-slack-request-timestamp'];
  const signature = req.headers['x-slack-signature'];
  if (!secret || !timestamp || !signature) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 60 * 5) return false;
  const base = `v0:${timestamp}:${rawBody.toString('utf8')}`;
  const hmac = 'v0=' + crypto.createHmac('sha256', secret).update(base).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(signature));
  } catch {
    return false;
  }
}

function stripSlackLink(text) {
  if (!text) return text;
  const m = text.match(/^<([^|>]+)(?:\|([^>]+))?>$/);
  if (m) return m[2] || m[1];
  return text;
}

function extractSubmission(event, ownerEmail) {
  const attachment = (event.attachments || [])[0];
  if (!attachment) return null;

  const fields = attachment.fields || [];
  const emailField = fields.find((f) => /email/i.test(f.title || ''));
  const emailValue = emailField ? stripSlackLink(emailField.value) : '';
  if (!emailValue || !emailValue.toLowerCase().includes(ownerEmail.toLowerCase())) {
    return null;
  }

  const viewAction = (attachment.actions || []).find((a) => /view submission/i.test(a.text || ''));
  const urlField = fields.find((f) => /url/i.test(f.title || '') && !/email/i.test(f.title || ''));
  const url = (viewAction && viewAction.url) || (urlField && stripSlackLink(urlField.value));
  if (!url) return null;

  const title = attachment.title || attachment.fallback || 'JotForm submission';
  const notes = fields
    .filter((f) => f !== emailField && f !== urlField)
    .map((f) => `${f.title}: ${stripSlackLink(f.value)}`)
    .join('\n');

  return { title, url, notes, tags: 'jotform-submission', status: 'completed' };
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const rawBody = await getRawBody(req);
  if (!verifySlackSignature(req, rawBody)) {
    return res.status(401).json({ error: 'invalid signature' });
  }
  const body = JSON.parse(rawBody.toString('utf8'));

  if (body.type === 'url_verification') {
    return res.status(200).json({ challenge: body.challenge });
  }

  if (req.headers['x-slack-retry-num']) {
    return res.status(200).end('ok');
  }

  if (body.type === 'event_callback' && body.event && body.event.type === 'message') {
    const ownerEmail = process.env.OWNER_EMAIL || 'jwarden@arenaclub.com';
    const submission = extractSubmission(body.event, ownerEmail);
    if (submission) {
      await ensureSchema();
      const existing = (await sql`SELECT id FROM forms WHERE url = ${submission.url}`).rows[0];
      if (existing) {
        await sql`
          UPDATE forms SET title = ${submission.title}, notes = ${submission.notes}, tags = ${submission.tags}, status = ${submission.status}
          WHERE id = ${existing.id}
        `;
      } else {
        await sql`
          INSERT INTO forms (title, url, notes, tags, status)
          VALUES (${submission.title}, ${submission.url}, ${submission.notes}, ${submission.tags}, ${submission.status})
        `;
      }
    }
  }

  return res.status(200).end('ok');
};

module.exports.config = config;
