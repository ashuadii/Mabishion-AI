# Global Rules

General engineering standards that apply across every project.

---

## Cost

- Default cost is ₹0. No paid services, APIs, or external tools without explicit owner approval.
- Daily AI cost cap: ₹150. Monthly cap: ₹1,500.

## Safety

- No critical business, client, payment, delivery, or publishing decision may be taken autonomously.
- Route all significant actions through the human approval system.

## Security

- Never hardcode API keys in source files. Use `secret://` references and Tauri secure storage.
- Parameterised queries only. Never interpolate variables into SQL strings.
- Client cannot see: blueprints, schemas, worker logs, pricing strategy, or API keys.

## Implementation

- Make the smallest change that solves the problem. Never broaden scope.
- Merge and repair existing features. Never delete working code without explicit instruction.
- If a feature conflicts with another, choose the option with higher stability and lower token cost.
- Build must pass (exit code 0) before any change is considered done.

## Communication

- Explain every meaningful change in simple Hinglish before and after making it.
- State what file changes, why it changes, and what must not be touched.
- Flag risks immediately. Do not bury concerns in long explanations.
