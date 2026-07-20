const { execSync } = require('child_process');
execSync('git reset --hard', {stdio: 'inherit'});
execSync('git clean -fd', {stdio: 'inherit'});
