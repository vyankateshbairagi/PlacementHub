const fs = require('fs');
const path = require('path');

const roles = ['student', 'faculty', 'tpo', 'recruiter', 'alumni', 'institute'];

roles.forEach(role => {
  const file = path.join(__dirname, '..', 'src', 'app', role, 'page.tsx');
  if (!fs.existsSync(file)) {
    console.log(`File not found: ${file}`);
    return;
  }
  const content = fs.readFileSync(file, 'utf8');
  console.log(`\n================== ${role.toUpperCase()} ==================`);
  
  // Find activeTab or activePath state
  const stateMatches = content.match(/const\s*\[\s*(activeTab|activePath|currentTab)[^\]]*\]\s*=\s*useState[^;]*/g);
  if (stateMatches) {
    stateMatches.forEach(s => console.log('State:', s.trim()));
  }

  // Find StitchDashboardShell props
  const shellMatch = content.match(/<StitchDashboardShell[^>]*>/s);
  if (shellMatch) {
    console.log('Shell Props:\n', shellMatch[0]);
  }

  // Find all comparisons with activeTab / activePath
  const tabRegex = /(?:activeTab|activePath|currentTab)\s*===\s*['"]([^'"]+)['"]/g;
  const tabs = new Set();
  let match;
  while ((match = tabRegex.exec(content)) !== null) {
    tabs.add(match[1]);
  }
  console.log('JSX Tab checks:', Array.from(tabs));
});
