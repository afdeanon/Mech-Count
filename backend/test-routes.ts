// Test blueprint routes import
import('./src/routes/blueprints.js').then(() => {
  console.log('✅ Routes import successful');
}).catch((e) => {
  console.log('❌ Routes error:', e.message);
});