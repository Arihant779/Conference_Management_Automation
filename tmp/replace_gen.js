const fs = require('fs');

const content = fs.readFileSync('src/components/Dashboard/EmailComposer.jsx', 'utf8');

const regex = /const res = await fetch\(`\$\{API_BASE_URL\}\/api\/generate-email`, \{(?:[^}]*?\n)*?\s*method: 'POST',(?:\n.*?)*?body: JSON\.stringify\(\{ intent, tone, subject, recipientDescription, conferenceTitle: conf\?\.title, senderRole \}\),(?:[^}]*?\n)*?\s*\}\);/m;

const replacement = `const contextIntent = intent + " (IMPORTANT: Do NOT greet the group generally, e.g., 'Dear All Members'. You must use exactly the literal placeholder '{Name}' in your greeting (e.g. 'Dear {Name},') so the system can personalize each email dynamically.)";
      
        const res = await fetch(\`\${API_BASE_URL}/api/generate-email\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ intent: contextIntent, tone, subject, recipientDescription, conferenceTitle: conf?.title, senderRole }),
        });`;

const updated = content.replace(regex, replacement);
fs.writeFileSync('src/components/Dashboard/EmailComposer.jsx', updated);
console.log('done replacing generateEmail');