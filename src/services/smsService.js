const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioFrom = process.env.TWILIO_FROM || 'GoodPulse';

const sendOTP = async (phone, otp, countryCode = '+91') => {
  try {
    const client = twilio(accountSid, authToken);
    const fullNumber = phone.startsWith('+') ? phone : `${countryCode}${phone}`;

    const message = await client.messages.create({
      body: `Your GoodPulse verification code is: ${otp}. Valid for 5 minutes. Do not share this code.`,
      from: twilioFrom,
      to: fullNumber,
    });

    console.log(`SMS sent to ${fullNumber}, SID: ${message.sid}`);
    return message;
  } catch (error) {
    console.error('Twilio SMS error:', error.message);
    throw error;
  }
};

module.exports = { sendOTP };
