import { Router } from 'express';
import { getDb } from '../database/Database.js';

const router = Router();

const OR_CREDITS_URL = 'https://openrouter.ai/api/v1/auth/key';
const IR_CREDITS_URL = 'https://api.imagerouter.io/v1/auth/key';

router.get('/', async (_req, res) => {
  const db = getDb();

  // --- Tokens today ---
  const today = new Date().toISOString().split('T')[0];
  const tokenRow = db.query(
    `SELECT COALESCE(SUM(tokens_input),0) as input, COALESCE(SUM(tokens_output),0) as output,
            COALESCE(SUM(tokens_cache),0) as cache
     FROM tasks WHERE created_at >= ?`
  ).get(today) as { input: number; output: number; cache: number };

  // --- Agents ---
  const totalAgents = (db.query('SELECT COUNT(*) as c FROM agents').get() as { c: number }).c;
  const usedAgents = (db.query(
    "SELECT COUNT(DISTINCT agent_id) as c FROM tasks WHERE agent_id IS NOT NULL"
  ).get() as { c: number }).c;

  // --- Plugins / Skills ---
  const totalPlugins = (db.query('SELECT COUNT(*) as c FROM plugins WHERE enabled=1').get() as { c: number }).c;
  const pluginRows = db.query('SELECT name, skill_files FROM plugins WHERE enabled=1').all() as { name: string; skill_files: string }[];

  // Skills used (observations with type containing 'skill' or 'tool_execution' referencing skills)
  const usedSkills = (db.query(
    "SELECT COUNT(DISTINCT content) as c FROM observations WHERE type='tool_execution' AND content LIKE '%skill%'"
  ).get() as { c: number }).c;

  // Unused skills: extract from plugin skill_files, compare against used
  const allSkillNames: string[] = [];
  for (const p of pluginRows) {
    try {
      const files = JSON.parse(p.skill_files || '[]');
      for (const f of files) {
        const name = f.split(/[/\\]/).pop()?.replace(/\.(md|skill\.md)$/i, '') || f;
        allSkillNames.push(name);
      }
    } catch {}
  }

  // --- Balances ---
  const orApiKey = process.env.OPENROUTER_API_KEY;
  let openRouterBalance: number | null = null;
  if (orApiKey) {
    try {
      const credRes = await fetch(OR_CREDITS_URL, {
        headers: { 'Authorization': `Bearer ${orApiKey}` },
        signal: AbortSignal.timeout(5000),
      });
      if (credRes.ok) {
        const credData = await credRes.json();
        openRouterBalance = credData?.data?.credits ?? credData?.credits ?? null;
      }
    } catch {}
  }

  const irApiKey = process.env.IMAGEROUTER_API_KEY;
  let imageRouterBalance: number | null = null;
  if (irApiKey) {
    try {
      const credRes = await fetch(IR_CREDITS_URL, {
        headers: { 'Authorization': `Bearer ${irApiKey}` },
        signal: AbortSignal.timeout(5000),
      });
      if (credRes.ok) {
        const credData = await credRes.json();
        imageRouterBalance = credData?.data?.credits ?? credData?.credits ?? null;
      }
    } catch {}
  }

  // --- Cost estimate ---
  const costPer1KTokens = 0.00015; // deepseek-v4-flash-free is free, just a placeholder
  const totalTokens = tokenRow.input + tokenRow.output;
  const cost = Math.round(totalTokens / 1000 * costPer1KTokens * 100) / 100;

  res.json({
    tokens: {
      input: tokenRow.input,
      output: tokenRow.output,
      cache: tokenRow.cache,
      cost,
    },
    agents: {
      total: totalAgents,
      used: usedAgents,
      unused: totalAgents - usedAgents,
    },
    skills: {
      installed: allSkillNames.length,
      used: usedSkills,
      unusedCount: Math.max(0, allSkillNames.length - usedSkills),
      unusedList: allSkillNames,
    },
    balances: {
      openrouter: openRouterBalance,
      imagerouter: imageRouterBalance,
    },
  });
});

export default router;
