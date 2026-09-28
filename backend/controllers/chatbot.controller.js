const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/respond');
const aiService = require('../services/ai.service');

/**
 * POST /api/chatbot — AI assistant.
 * Public endpoint (no login required); when logged in we also report the
 * user's real order status via the live database context.
 */
const chat = asyncHandler(async (req, res) => {
  const { message, history = [] } = req.body;
  if (!message || !String(message).trim()) {
    return ok(res, { data: { reply: 'Hello! How can I help you today?', source: 'fallback' } });
  }

  const result = await aiService.answerChat({
    message: String(message).slice(0, 1000),
    userId: req.user?._id,
    history: Array.isArray(history) ? history : [],
  });

  ok(res, { data: { reply: result.reply, source: result.source } });
});

module.exports = { chat };