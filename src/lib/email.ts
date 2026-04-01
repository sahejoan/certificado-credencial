import { Participant, Event } from '../types';

/**
 * Simulates sending an email notification to a registered participant.
 * In a real-world scenario, this would call an API like Resend, SendGrid, or a custom backend.
 */
export async function sendRegistrationEmail(participant: Participant, event: Event) {
  console.log(`[EMAIL SIMULATION] Sending registration email to ${participant.email}`);
  console.log(`Subject: Registro Exitoso - ${event.name}`);
  console.log(`Body: Hola ${participant.name}, te has registrado exitosamente para el evento ${event.name}.`);
  
  // If you have a Resend API key, you could implement it here:
  /*
  const response = await fetch('/api/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: participant.email,
      subject: `Registro Exitoso - ${event.name}`,
      participant,
      event
    })
  });
  */

  return true;
}
