const twilio = require('twilio');


const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN   
);

const sendSMS = async (to, message) => {
    try {
        await client.messages.create({
            body: message,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: to,
        });
        console.log(`SMS sent to ${to}`);
        return true;
    } catch (error) {
        console.error('Error sending SMS:', error);
        return false;
    }
};

const sendAppointmentSMS = async (phone, appointmentDetails) => {
    const message = `Your appointment is confirmed on ${appointmentDetails.date} at ${appointmentDetails.time} with ${appointmentDetails.host}. Location: ${appointmentDetails.location}.`;
    return await sendSMS(phone, message);
};

module.exports = {
    sendSMS,
    sendAppointmentSMS,
};