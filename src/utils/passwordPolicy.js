import settingsCache from '@/core/settingsCache.js';

const COMMON_PASSWORDS = new Set([
  'password', '123456', '12345678', '123456789', '1234567890', '1234567',
  '12345', '1234', '123', '12345678910', 'qwerty', 'qwerty123', 'qwertyuiop',
  '1q2w3e4r', '1qaz2wsx', 'qwertz', 'azerty', 'admin', 'administrator',
  'letmein', 'welcome', 'monkey', 'dragon', 'master', 'master123', 'sunshine',
  'princess', 'football', 'baseball', 'basketball', 'hockey', 'soccer',
  'charlie', 'donald', 'donald123', 'trustno1', 'passw0rd', 'passwd',
  'password1', 'password12', 'password123', 'Password', 'P@ssword',
  'passwrd', 'pa$$word', 'p@ssword', 'p@ssw0rd', 'pass123', 'pass1234',
  'pwd', 'pw123', 'secret', 'secret123', 'iloveyou', 'iloveyou123',
  'loveme', 'lovely', 'love123', 'flower', 'flower123', 'shadow',
  'shadow123', 'shadows', '123qwe', '123qweasd', 'qwe123', 'abc123',
  'abcd1234', 'abcdef', 'abcdefg', 'abcdefgh', 'test', 'test123',
  'test1234', 'guest', 'guest123', 'temp', 'temp123', 'default',
  'changeme', 'changeit', 'changethis', 'newuser', 'user', 'user123',
  'user1', 'user1234', 'login', 'login123', 'pass', 'pass12345',
  'hello', 'hello123', 'helloworld', 'world', 'world123', 'batman',
  'superman', 'spiderman', 'ironman', 'captain', 'wolverine', 'harry',
  'harrypotter', 'voldemort', 'starwars', 'jedi', 'yoda', 'chewbacca',
  'pokemon', 'pikachu', 'charizard', 'mario', 'luigi', 'peach',
  'nintendo', 'xbox', 'playstation', 'ps4', 'xbox360', 'minecraft',
  'fortnite', 'roblox', 'gta', 'gta123', 'callofduty', 'assassin',
  'naruto', 'sasuke', 'kakashi', 'itachi', 'goku', 'vegeta',
  'dragonball', 'onepiece', 'luffy', 'zoro', 'natsu', 'eren',
  'titan', 'aot', 'deathnote', 'light', 'kira', 'l123456',
  'fuckyou', 'fuckyou123', 'fuck', 'bitch', 'sex', 'sexy',
  'sexy123', 'hotstuff', 'hotdog', 'beauty', 'beautiful', 'pretty',
  'butterfly', 'butterfly1', 'crystal', 'crystal123', 'diamond', 'diamond1',
  'golden', 'gold123', 'silver', 'silver123', 'bronze', 'platinum',
  'summer', 'summer123', 'winter', 'winter123', 'spring', 'autumn',
  'jordan', 'jordan23', 'michael', 'mike', 'smith', 'andrew',
  'joshua', 'matthew', 'daniel', 'david', 'david123', 'james',
  'robert', 'john', 'john123', 'johnny', 'william', 'william1',
  'oliver', 'jack', 'jack123', 'jackson', 'thomas', 'thomas1',
  'chris', 'christopher', 'nick', 'nick123', 'alex', 'alex123',
  'alexander', 'ben', 'benjamin', 'sam', 'sam123', 'samuel',
  'max', 'max123', 'leo', 'leo123', 'kai', 'kai123',
  'noah', 'liam', 'liam123', 'mason', 'ethan', 'logan',
  'lucas', 'jason', 'jason123', 'justin', 'justin1', 'brian',
  'ryan', 'ryan123', 'kevin', 'kevin123', 'steven', 'scott',
  'brandon', 'tyler', 'tyler123', 'adam', 'adams', 'adrian',
  'gabriel', 'victor', 'victor123', 'martin', 'martin1', 'oscar',
  'george', 'george123', 'harry1', 'oliver1', 'charlie1', 'jack1',
  'alfie', 'riley', 'muhammad', 'mohammed', 'ahmed', 'ali',
  'ali123', 'hassan', 'hussain', 'omar', 'omar123', 'yusuf',
  'solo', 'soleil', 'star', 'starlight', 'moon', 'moonlight',
  'sun', 'sunny', 'sunny123', 'sky', 'sky123', 'skywalker',
  'rain', 'rainbow', 'rainbow1', 'cloud', 'cloudy', 'storm',
  'thunder', 'lightning', 'water', 'fire', 'fire123', 'earth',
  'wind', 'ocean', 'river', 'mountain', 'forest', 'tree123',
  'tiger', 'tiger123', 'lion', 'lion123', 'bear', 'bear123',
  'wolf', 'wolf123', 'eagle', 'hawk', 'falcon', 'phoenix',
  'rose', 'rose123', 'lily', 'lily123', 'daisy', 'daisy123',
  'angel', 'angel123', 'heaven', 'heaven1', 'paradise', 'destiny',
  'freedom', 'liberty', 'justice', 'peace', 'peace123', 'happy',
  'happiness', 'smile', 'smiley', 'laugh', 'laughter', 'family',
  'friend', 'friends', 'brother', 'sister', 'mother', 'father',
  'baby', 'baby123', 'kids', 'children', 'school', 'college',
  'university', 'student', 'teacher', 'professor', 'doctor', 'doctor1',
  'nurse', 'nurse123', 'police', 'police1', 'fireman', 'engineer',
  'lawyer', 'pilot', 'driver', 'king', 'king123', 'queen',
  'queen123', 'prince', 'prince1', 'royal', 'royal123', 'noble',
  'knight', 'warrior', 'soldier', 'soldier1', 'marine', 'navy',
  'army', 'army123', 'airforce', 'ranger', 'agent', 'agent007',
  'bond', 'jamesbond', '007', '007bond', 'money', 'money123',
  'million', 'billion', 'dollar', 'dollar1', 'cash', 'cash123',
  'bank', 'bank123', 'credit', 'bitcoin', 'btc', 'crypto',
  'admin123', 'root', 'root123', 'server', 'server1', 'backup',
  'billing', 'info', 'info123', 'support', 'webmaster', 'web123',
  'site', 'site123', 'internet', 'network', 'system', 'system1',
  'manager', 'manager1', 'director', 'ceo', 'ceo123', 'owner',
  'office', 'office1', 'business', 'company', 'company1', 'corp',
  'corporate', '123456a', '123456b', 'a123456', 'a12345', 'b12345',
  'zxc', 'zxcvbnm', 'asdfgh', 'asdf', 'asdf1234', 'qwerty1',
  'qwerty1234', 'qwerty12345', '1q2w3e4r5t', '12qwaszx', 'zaqxsw',
  'xsw2', 'cde3', '4rfv', '5tgb', '6yhn', '7ujm',
  '8ik,', '9ol.', '0p;/', '!@#$%', '!@#$%^&*', 'pass1234',
  'testuser', 'test12', 'tester', 'tester1', 'demo', 'demo123',
  'sample', 'example', 'example123', 'changepassword', 'newpassword',
  'mypassword', 'mypass', 'mysecret', 'my123', 'pass123456',
  'password1234', 'password12345', 'Passw0rd', 'P@$$w0rd',
  'letmein123', 'welcome123', 'welcome1', 'admin1234', 'admin2018',
  'admin2019', 'admin2020', 'admin2021', 'admin2022', 'admin2023',
  'admin2024', 'admin2025', 'admin2026',
]);

export function isCommonPassword(password) {
  return COMMON_PASSWORDS.has(password.toLowerCase());
}

function readPolicy() {
  const raw = settingsCache.get('passwordPolicy');
  if (raw === 'Low (6+ chars)') return { minLength: 6, requireUppercase: false, requireLowercase: false, requireNumber: false, requireSpecial: false };
  if (raw === 'High (12+ chars, special)') return { minLength: 12, requireUppercase: true, requireLowercase: true, requireNumber: true, requireSpecial: true };
  return { minLength: 8, requireUppercase: true, requireLowercase: true, requireNumber: true, requireSpecial: false };
}

export function getPasswordMinLength() {
  return readPolicy().minLength;
}

export function getPasswordRequirements() {
  return readPolicy();
}

export function validatePassword(password) {
  const reqs = readPolicy();
  const errors = [];
  if (!password || password.length < reqs.minLength) errors.push(`At least ${reqs.minLength} characters`);
  if (reqs.requireUppercase && !/[A-Z]/.test(password)) errors.push('At least one uppercase letter');
  if (reqs.requireLowercase && !/[a-z]/.test(password)) errors.push('At least one lowercase letter');
  if (reqs.requireNumber && !/[0-9]/.test(password)) errors.push('At least one number');
  if (reqs.requireSpecial && !/[^A-Za-z0-9]/.test(password)) errors.push('At least one special character');
  if (isCommonPassword(password)) errors.push('Common password — choose something less guessable');
  return { valid: errors.length === 0, errors };
}
