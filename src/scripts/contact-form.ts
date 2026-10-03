// Contact form behaviour. Values live only in the fields: nothing is written to the URL, to storage or to a log.
//   [data-contact]              wrapper of the form and the confirmation
//   form[data-contact-form]     fields named name, contact, type, message, consent, website (honeypot)
//   [data-contact-error="key"]  message for name | contact | consent; shown while that field is invalid
//   [data-contact-fail]         role="alert" shown when sending fails; its data-message is written into
//                               [data-contact-fail-text] at that moment, so the alert is announced
//   [data-contact-done]         confirmation; [data-contact-name] receives the entered name as text
//   [data-contact-new]          button that brings the empty form back
import { processContact, validateContact, type ContactErrors, type ContactValues } from '../lib/contact';
import { submitContact } from '../lib/contact-transport';

const KEYS = ['name', 'contact', 'consent'] as const;

function initContactForm(root: HTMLElement): void {
  const form = root.querySelector<HTMLFormElement>('form[data-contact-form]');
  const done = root.querySelector<HTMLElement>('[data-contact-done]');
  const nameOut = root.querySelector<HTMLElement>('[data-contact-name]');
  const fail = root.querySelector<HTMLElement>('[data-contact-fail]');
  const failText = fail?.querySelector<HTMLElement>('[data-contact-fail-text]');
  const again = root.querySelector<HTMLButtonElement>('[data-contact-new]');
  const submit = form?.querySelector<HTMLButtonElement>('button[type="submit"]');
  if (!form || !done || !nameOut || !fail || !failText || !again || !submit) return;

  const input = (name: string) => form.elements.namedItem(name) as HTMLInputElement;
  const fields = { name: input('name'), contact: input('contact'), consent: input('consent') };
  const messages = Object.fromEntries(
    KEYS.map((key) => [key, form.querySelector<HTMLElement>(`[data-contact-error="${key}"]`)]),
  ) as Record<(typeof KEYS)[number], HTMLElement | null>;
  // Hints that describe a field all the time; the error id is added only while the error is shown,
  // because a referenced element is read out even when it is hidden.
  const hints = Object.fromEntries(KEYS.map((key) => [key, fields[key].getAttribute('aria-describedby') ?? '']));

  let busy = false;
  let tried = false;

  const read = (): ContactValues => ({
    name: fields.name.value,
    contact: fields.contact.value,
    type: input('type').value,
    message: input('message').value,
    consent: fields.consent.checked,
    website: input('website').value,
  });

  function showErrors(errors: ContactErrors): void {
    for (const key of KEYS) {
      const field = fields[key];
      const message = messages[key];
      const invalid = errors[key] === true;
      if (message) message.hidden = !invalid;
      if (invalid) field.setAttribute('aria-invalid', 'true');
      else field.removeAttribute('aria-invalid');
      const described = [hints[key], invalid && message ? message.id : ''].filter(Boolean).join(' ');
      if (described) field.setAttribute('aria-describedby', described);
      else field.removeAttribute('aria-describedby');
    }
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (busy) return;
    busy = true;
    submit.disabled = true;
    fail.hidden = true;
    failText.textContent = '';
    const values = read();
    const outcome = await processContact(values, submitContact);
    busy = false;
    submit.disabled = false;

    if (outcome.status === 'invalid') {
      tried = true;
      showErrors(outcome.errors);
      const first = KEYS.find((key) => outcome.errors[key]);
      if (first) fields[first].focus();
    } else if (outcome.status === 'failed') {
      fail.hidden = false;
      failText.textContent = fail.dataset.message ?? '';
      submit.focus();
    } else {
      nameOut.textContent = values.name.trim();
      form.reset();
      tried = false;
      showErrors({});
      form.hidden = true;
      done.hidden = false;
      done.focus();
    }
  });

  // After a failed attempt each message follows its field as the visitor corrects it.
  const recheck = () => { if (tried) showErrors(validateContact(read()).errors); };
  form.addEventListener('input', recheck);
  form.addEventListener('change', recheck);

  again.addEventListener('click', () => {
    done.hidden = true;
    nameOut.textContent = '';
    form.hidden = false;
    fields.name.focus();
  });

  // The button is disabled in the markup, so the form cannot post anywhere before this script is in charge.
  submit.disabled = false;
}

document.querySelectorAll<HTMLElement>('[data-contact]').forEach(initContactForm);
