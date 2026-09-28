/**
 * Seed system categories only (empty collection guard).
 *   npm run seed:categories
 *
 * Categories are system constants — NOT products. No medicine data is seeded;
 * products must be created by an authorized admin through the dashboard.
 */
const db = require('../config/db');
const Category = require('../models/Category');

const SYSTEM_CATEGORIES = [
  { name: 'Tablets', icon: 'Pill', description: 'Oral tablets and pills' },
  { name: 'Capsules', icon: 'Capsule', description: 'Hard-shell capsules' },
  { name: 'Syrups', icon: 'Droplets', description: 'Oral liquid formulations' },
  { name: 'Injections', icon: 'Syringe', description: 'Injectable preparations' },
  { name: 'Creams', icon: 'Sparkles', description: 'Topical creams' },
  { name: 'Ointments', icon: 'Layers', description: 'Medicated ointments' },
  { name: 'Drops', icon: 'Eye', description: 'Eye/ear/nasal drops' },
  { name: 'Medical Devices', icon: 'HeartPulse', description: 'Diagnostic and medical devices' },
  { name: 'Surgical Supplies', icon: 'Scissors', description: 'Surgical consumables' },
  { name: 'First Aid', icon: 'Cross', description: 'First-aid essentials' },
  { name: 'Vitamins', icon: 'Citrus', description: 'Vitamin and mineral supplements' },
  { name: 'Healthcare Products', icon: 'Stethoscope', description: 'General healthcare products' },
  { name: 'Personal Care', icon: 'Hand', description: 'Personal care & hygiene' },
  { name: 'Other Medical Needs', icon: 'PackageOpen', description: 'Miscellaneous medical requirements' },
];

(async () => {
  await db.connectDB({ retries: 2 });

  const count = await Category.countDocuments();
  if (count > 0) {
    console.log(`✔ Categories already present (${count}). Skipping seed.`);
    await db.disconnectDB();
    return;
  }

  const slug = (name) => name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const docs = SYSTEM_CATEGORIES.map((c) => ({ ...c, slug: slug(c.name), isSystem: true, active: true }));
  const inserted = await Category.insertMany(docs);

  console.log(`✔ Seeded ${inserted.length} system categories (no products — those are created by admins).`);
  await db.disconnectDB();
})().catch(async (err) => {
  console.error(`✖ Category seed failed: ${err.message}`);
  await db.disconnectDB();
  process.exit(1);
});