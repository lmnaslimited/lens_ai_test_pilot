  // src/delay.ts
  export function fnGetDelay(type: 'short' | 'medium' | 'long' = 'medium'): number {
    const L_mode = typeof Cypress !== "undefined" && Cypress.env
      ? (Cypress.env("RUNNING_MODE") || "UI").toUpperCase()
      : (process.env.RUNNING_MODE || "UI").toUpperCase();
  
    const L_key = `DELAY_${L_mode}_${type.toUpperCase()}`;
    const L_delay = Number(Cypress.env(L_key));
  
    return L_delay;
  }
  