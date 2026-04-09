import { Participant, Event } from '../types';

/**
 * Simulates sending an email notification to a registered participant.
 * In a real-world scenario, this would call an API like Resend, SendGrid, or a custom backend.
 */
export async function sendRegistrationEmail(participant: Participant, event: Event) {
  try {
    const response = await fetch('/api/send-registration-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: participant.email,
        name: participant.name,
        eventName: event.name
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Error sending registration email:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in sendRegistrationEmail:', error);
    return false;
  }
}
