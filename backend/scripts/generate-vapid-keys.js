import webpush from 'web-push';

const keys = webpush.generateVAPIDKeys();
console.log('# Aggiungi queste variabili a backend/.env (non committare i secret)');
console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log('VAPID_SUBJECT=mailto:admin@example.com');
