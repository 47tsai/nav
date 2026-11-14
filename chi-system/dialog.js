/* chi-system Dialog — native modal dialog with managed initial/return focus. */
(function () {
  'use strict';

  const DIALOG_SELECTOR = 'dialog.chi-dialog';
  const OPEN_SELECTOR = '[data-chi-dialog-open]';
  const CLOSE_SELECTOR = '[data-chi-dialog-close]';
  const initialized = new WeakSet();
  const returnFocus = new WeakMap();

  function getDialog(value) {
    if (!value) return null;
    const id = value.charAt(0) === '#' ? value.slice(1) : value;
    const candidate = document.getElementById(id);
    return candidate && candidate.matches && candidate.matches(DIALOG_SELECTOR) ? candidate : null;
  }

  function initialFocusTarget(dialog) {
    const target = dialog.querySelector('[autofocus]:not(:disabled), [data-chi-dialog-initial-focus]:not(:disabled)')
      || dialog.querySelector('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])')
      || dialog.querySelector('.chi-dialog__title[tabindex="-1"]');
    if (target) return target;
    if (!dialog.hasAttribute('tabindex')) dialog.setAttribute('tabindex', '-1');
    return dialog;
  }

  function init(dialog) {
    if (!dialog || initialized.has(dialog)) return;
    if (typeof dialog.showModal !== 'function' || typeof dialog.close !== 'function') return;
    initialized.add(dialog);
    dialog.addEventListener('close', function () {
      const opener = returnFocus.get(dialog);
      returnFocus.delete(dialog);
      if (opener && opener.isConnected && typeof opener.focus === 'function') opener.focus();
    });
    dialog.addEventListener('click', function (event) {
      if (event.target === dialog && dialog.hasAttribute('data-chi-dialog-backdrop-close')) close(dialog, 'backdrop');
    });
  }

  function open(dialog, opener) {
    if (!dialog) return false;
    init(dialog);
    if (typeof dialog.showModal !== 'function' || dialog.open) return false;
    if (dialog.isConnected === false) return false;
    returnFocus.set(dialog, opener || document.activeElement);
    try {
      dialog.showModal();
    } catch {
      returnFocus.delete(dialog);
      return false;
    }
    const target = initialFocusTarget(dialog);
    if (target && typeof target.focus === 'function') target.focus();
    return true;
  }

  function close(dialog, returnValue) {
    if (!dialog || !dialog.open || typeof dialog.close !== 'function') return false;
    dialog.close(returnValue || '');
    return true;
  }

  function closest(target, selector) {
    return target && typeof target.closest === 'function' ? target.closest(selector) : null;
  }

  function onDocumentClick(event) {
    const opener = closest(event.target, OPEN_SELECTOR);
    if (opener) {
      const dialog = getDialog(opener.getAttribute('data-chi-dialog-open'));
      if (dialog) {
        event.preventDefault();
        open(dialog, opener);
      }
      return;
    }

    const closer = closest(event.target, CLOSE_SELECTOR);
    if (closer) {
      const dialog = closest(closer, DIALOG_SELECTOR);
      if (dialog) {
        event.preventDefault();
        close(dialog, closer.getAttribute('data-chi-dialog-return-value'));
      }
    }
  }


  function initAll() {
    document.querySelectorAll(DIALOG_SELECTOR).forEach(init);
  }

  document.addEventListener('click', onDocumentClick);
  initAll();

  window.ChiDialog = { init, initAll, open, close };
})();