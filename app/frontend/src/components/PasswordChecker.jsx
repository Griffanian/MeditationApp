const rules = [
  { test: pw => pw.length >= 8, label: '8+ characters' },
  { test: pw => /[A-Z]/.test(pw), label: 'Uppercase letter' },
  { test: pw => /[a-z]/.test(pw), label: 'Lowercase letter' },
  { test: pw => /[0-9]/.test(pw), label: 'Number' },
];

export function passwordIsValid(password) {
  return rules.every(r => r.test(password));
}

export default function PasswordChecker({ password }) {
  return (
    <ul className="pw-checker">
      {rules.map(({ test, label }) => {
        const pass = test(password);
        return (
          <li key={label} className={`pw-checker-rule ${pass ? 'pass' : 'fail'}`}>
            <span className="pw-checker-icon">{pass ? '\u2713' : '\u2717'}</span>
            {label}
          </li>
        );
      })}
    </ul>
  );
}
