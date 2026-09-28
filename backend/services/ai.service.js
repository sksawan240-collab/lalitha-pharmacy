const env = require('../config/env');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Order = require('../models/Order');
const Announcement = require('../models/Announcement');

/**
 * Lalitha Pharmacy AI Assistant.
 * Policy: general information only — never a doctor; product/order facts are
 * always grounded in the live database; availability is never invented.
 */
const MEDICAL_DISCLAIMER =
  'I provide general pharmacy and service information only. I am not a doctor and not a ' +
  'substitute for professional medical advice. Please consult a qualified doctor or pharmacist ' +
  'for diagnosis, prescriptions, dosage, emergencies or treatment decisions.';

const SYSTEM_PROMPT = `You are "Lalitha Pharmacy AI Assistant" — the helpful assistant of Lalitha Pharmacy,
a pharmaceutical distribution company in India (pharmacy medicines, devices, healthcare products).

RULES YOU MUST ALWAYS FOLLOW:
1. ${MEDICAL_DISCLAIMER}
2. NEVER invent product availability, prices, order statuses, coupons, dosages or prescriptions.
3. You are given a CONTEXT section (real data from our database when relevant). Answer product,
   category, order and service questions ONLY from that context.
4. If the information is not in the context, say you cannot check it right now and suggest
   contacting our support team (support@lalithapharmacy.com) or visiting the website.
5. Be concise, warm, professional. Use short paragraphs or bullet lists.
6. Never claim to be a certified medical professional.

CURRENT WEBSITE:
- Browse products, place orders, track orders, download GST invoices, and contact support.
- Prescription-required medicines need a valid prescription upload at checkout.

{{db_context}}`;

/**
 * Gather live database context relevant to the user's question.
 * Guarantees the AI never has to invent availability or order information.
 */
const buildDbContext = async ({ userId, query }) => {
  const q = (query || '').toLowerCase();
  const sections = [];

  if (/(product|medicine|tablet|capsule|syrup|injection|cream|stock|available|price|brand|category)/.test(q)) {
    const products = await Product.find({ active: true, quantity: { $gt: 0 } })
      .populate('category', 'name')
      .sort({ createdAt: -1 })
      .limit(12)
      .select('name genericName brandName category quantity distributorPrice mrp prescriptionRequired');
    sections.push(
      'AVAILABLE PRODUCTS (first 12, live data):\n' +
        (products.length
          ? products
              .map((p) => `- ${p.name} (${p.brandName || p.genericName || '—'}), ${p.category?.name || 'Uncategorised'}, ₹${p.distributorPrice}, stock: ${p.quantity}, prescription required: ${p.prescriptionRequired ? 'yes' : 'no'}`)
              .join('\n')
          : 'The catalogue is currently empty on the website.')
    );
  }

if (/(categor|types|what do you sell)/.test(q)) {
    const categories = await Category.find({ active: true }).select('name').limit(20);
    sections.push(
      'PRODUCT CATEGORIES (live): ' +
        (categories.length ? categories.map((c) => c.name).join(', ') : 'No categories added yet.')
    );
  }

  if (/(order|invoice|delivery|shipping|track)/.test(q)) {
    if (userId) {
      const orders = await Order.find({ customer: userId })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('orderId status total createdAt');
      sections.push(
        'YOUR RECENT ORDERS (live): ' +
          (orders.length
            ? orders.map((o) => `${o.orderId} → ${o.status}, ₹${o.total}`).join('; ')
            : 'You have no orders yet on our system.')
      );
    } else {
      sections.push(
        'ORDER TRACKING: please log in to see your live order status. You can also email support@lalithapharmacy.com with your order ID.'
      );
    }
  }

  if (/(announcement|news|update|important)/.test(q)) {
    const anns = await Announcement.find({ published: true }).sort({ publishedAt: -1 }).limit(5);
    sections.push(
      'PUBLISHED ANNOUNCEMENTS: ' +
        (anns.length ? anns.map((a) => `${a.title}: ${a.content.slice(0, 160)}`).join(' | ') : 'No announcements yet.')
    );
  }

  return sections.join('\n\n');
};

/**
 * Ask the assistant. When a provider key is configured, an LLM answers using
 * the live DB context; otherwise a rule-based fallback answers from the same
 * live context. Product/order facts always come from MongoDB.
 */
const answerChat = async ({ message, userId = null, history = [] }) => {
  const dbContext = await buildDbContext({ userId, query: message });
  const contextBlock = dbContext
    ? `\nCONTEXT (from the live database — only this data is authoritative):\n${dbContext}`
    : '\nCONTEXT: (no relevant live data found yet)';
  const systemPrompt = SYSTEM_PROMPT.replace('{{db_context}}', contextBlock);

  const messages = [
    { role: 'system', content: systemPrompt },
    ...(history.length ? history.slice(-8) : []),
    { role: 'user', content: message },
  ];

  if (env.aiConfigured) {
    try {
      if (env.ai.provider === 'gemini') {
        const url =
          `https://generativelanguage.googleapis.com/v1beta/models/${env.ai.geminiModel}:generateContent?key=${encodeURIComponent(env.ai.geminiKey)}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: messages.map((m) => `${m.role}: ${m.content}`).join('\n\n') }] }],
          }),
        });
        if (response.ok) {
          const json = await response.json();
          const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) return { source: 'gemini', reply: text };
        }
      } else {
        const response = await fetch(`${env.ai.apiBase}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.ai.apiKey}` },
          body: JSON.stringify({ model: env.ai.model, messages, temperature: 0.4, max_tokens: 500 }),
        });
        if (response.ok) {
          const json = await response.json();
          const text = json?.choices?.[0]?.message?.content;
          if (text) return { source: 'ai', reply: text };
        }
      }
      console.warn('[ai] provider returned no answer — using live-context fallback');
    } catch (err) {
      console.error(`[ai] provider error (${err.message}) — using live-context fallback`);
    }
  }

  return { source: 'fallback', reply: fallbackReply({ message, dbContext }) };
};

const fallbackReply = ({ message, dbContext }) => {
  const q = (message || '').toLowerCase();

  if (/(^|\s)(hi|hello|hey|namaste|good (morning|afternoon|evening))/.test(q)) {
    return `Hello! I'm the Lalitha Pharmacy AI Assistant. I can help you discover products, browse categories, or guide you through ordering and invoices. ${MEDICAL_DISCLAIMER}`;
  }
  // More specific patterns first to avoid false matches
  if (/(place|how do i order|how to buy|how to purchase)/.test(q)) {
    return 'To place an order: 1) Browse Products and add items to your cart, 2) Go to checkout, confirm your address and payment method, 3) Upload a valid prescription for any prescription-required medicine, 4) Confirm — you will receive real-time status updates and emails. Prescription-required items are dispatched only after verification.';
  }
  if (/(track|where is my order|order status)/.test(q)) {
    return 'To check a live order status you need to be signed in to your account. Please log in and ask me again — or reach support@lalithapharmacy.com with your order ID.';
  }
  if (/(invoice|bill|download invoice)/.test(q)) {
    return 'Invoices are available under "My Invoices" in your dashboard. Once an order is delivered (or prepaid orders are confirmed), we also email the PDF invoice to your registered email address.';
  }
  if (/(contact|call|phone|support|reach)/.test(q)) {
    return 'You can reach Lalitha Pharmacy at support@lalithapharmacy.com or by phone at +91 98450 00000 (9am–7pm IST). The Contact section on our website also has a contact form.';
  }
  if (/(service|delivery|return|payment|cod|online payment)/.test(q)) {
    return 'Our services: genuine pharmaceutical distribution, order tracking, GST invoices, cash-on-delivery and online payment (when enabled), prescription verification, and live stock updates. Returns follow our policy for damaged or unsealed deliveries.';
  }
  if (/(doctor|diagnos|treatment|dosage|prescrib|headache|fever|pain|sick|cough|cold|flu|infection|vomit|diarrhea|allergy|rash|injury|wound|burn|fracture|emergency)/.test(q)) {
    return `${MEDICAL_DISCLAIMER} I cannot diagnose, prescribe, or recommend treatments or dosages. A valid prescription from a qualified doctor is required to purchase prescription-only medicines from our platform.`;
  }
  if (/(tablet|capsule|syrup|injection|cream|ointment)/.test(q)) {
    return dbContext || 'The product catalogue is currently being updated. Please check the Products page or contact support@lalithapharmacy.com.';
  }
  if (/(product|medicine|stock|available|price|category|catalog)/.test(q)) {
    return dbContext || 'The product catalogue is currently being updated. Please check the Products page or contact support@lalithapharmacy.com.';
  }
  if (/(order|buy|purchase)/.test(q)) {
    return 'You can place orders through our website. Browse Products, add items to cart, and checkout. For order status, please log in to your account.';
  }
  return `I can help with products, categories, orders, invoices and services at Lalitha Pharmacy. ${MEDICAL_DISCLAIMER} You can also browse the Products page or write to support@lalithapharmacy.com.`;
};

module.exports = { answerChat, MEDICAL_DISCLAIMER };