// A light tick. Android browsers support navigator.vibrate; iOS Safari doesn't,
// but since iOS 18 toggling a native switch control gives a system haptic, so
// we keep a hidden one around and click its label.

let label: HTMLLabelElement | null = null;

function iosSwitch() {
  if (label) return label;
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.setAttribute('switch', '');
  input.id = 'rh-haptic';
  input.tabIndex = -1;
  label = document.createElement('label');
  label.htmlFor = input.id;
  label.setAttribute('aria-hidden', 'true');
  label.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;overflow:hidden;';
  label.appendChild(input);
  document.body.appendChild(label);
  return label;
}

export function tick() {
  try {
    if (typeof navigator.vibrate === 'function') {
      navigator.vibrate(8);
      return;
    }
    iosSwitch().click();
  } catch {
    // Haptics are a nicety; never let them break a pull.
  }
}
