import assert from 'node:assert';
import nodemailer from 'nodemailer';
import { sendOtp } from './utils.js';

async function runTests() {
  console.log('Starting sendOtp tests...');

  // Test 1: Dev fallback when SMTP is not configured
  {
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_SERVICE;
    process.env.NODE_ENV = 'development';

    const res = await sendOtp('anu@college.edu', '123456');
    assert.strictEqual(res, false, 'Expected sendOtp to return false when no SMTP is configured in dev');
    console.log('✓ Test 1: Dev fallback passed');
  }

  // Test 2: In production without SMTP, it throws error
  {
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_SERVICE;
    process.env.NODE_ENV = 'production';

    let threw = false;
    try {
      await sendOtp('anu@college.edu', '123456');
    } catch (e) {
      threw = true;
      assert.strictEqual(e.message, 'Email is not configured');
    }
    assert.strictEqual(threw, true, 'Expected sendOtp to throw error in production without SMTP');
    console.log('✓ Test 2: Production unconfigured throw passed');
  }

  // Test 3: Successful sendMail with mock nodemailer transporter
  {
    process.env.NODE_ENV = 'development';
    process.env.SMTP_HOST = 'smtp.fake.test';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_USER = 'bot@techfest.hub';
    process.env.SMTP_PASS = 'secret123';
    delete process.env.MAIL_FROM;

    const originalCreateTransport = nodemailer.createTransport;
    let sentMailArgs = null;

    nodemailer.createTransport = (config) => {
      assert.strictEqual(config.host, 'smtp.fake.test');
      assert.strictEqual(config.port, 587);
      assert.strictEqual(config.connectionTimeout, 10000);
      assert.strictEqual(config.greetingTimeout, 10000);
      assert.strictEqual(config.socketTimeout, 15000);
      return {
        sendMail: async (mailOptions) => {
          sentMailArgs = mailOptions;
          return { messageId: 'test-msg-id' };
        },
      };
    };

    try {
      const res = await sendOtp('anu@college.edu', '654321');
      assert.strictEqual(res, true, 'Expected sendOtp to return true on success');
      assert.ok(sentMailArgs, 'sendMail should have been called');
      assert.strictEqual(sentMailArgs.to, 'anu@college.edu');
      assert.strictEqual(sentMailArgs.from, '"TechFest Hub" <bot@techfest.hub>');
      assert.ok(sentMailArgs.text.includes('654321'));
      assert.ok(sentMailArgs.html.includes('654321'));
      console.log('✓ Test 3: Successful sendMail with mock passed');
    } finally {
      nodemailer.createTransport = originalCreateTransport;
    }
  }

  // Test 4: Error handling and friendly error mapping
  {
    process.env.SMTP_HOST = 'smtp.fake.test';
    const originalCreateTransport = nodemailer.createTransport;

    // 4a: EAUTH
    nodemailer.createTransport = () => ({
      sendMail: async () => {
        const err = new Error('Invalid credentials');
        err.code = 'EAUTH';
        throw err;
      },
    });

    try {
      let threwAuth = false;
      try {
        await sendOtp('test@test.com', '111111');
      } catch (err) {
        threwAuth = true;
        assert.ok(err.message.includes('Email authentication failed'), 'Expected friendly auth error message');
      }
      assert.strictEqual(threwAuth, true);
      console.log('✓ Test 4a: EAUTH error handled');
    } finally {
      nodemailer.createTransport = originalCreateTransport;
    }

    // 4b: ETIMEDOUT
    nodemailer.createTransport = () => ({
      sendMail: async () => {
        const err = new Error('Connection timeout');
        err.code = 'ETIMEDOUT';
        throw err;
      },
    });

    try {
      let threwTimeout = false;
      try {
        await sendOtp('test@test.com', '222222');
      } catch (err) {
        threwTimeout = true;
        assert.ok(err.message.includes('timed out'), 'Expected friendly timeout error message');
      }
      assert.strictEqual(threwTimeout, true);
      console.log('✓ Test 4b: ETIMEDOUT error handled');
    } finally {
      nodemailer.createTransport = originalCreateTransport;
    }

    // 4c: ECONNREFUSED
    nodemailer.createTransport = () => ({
      sendMail: async () => {
        const err = new Error('Connection refused');
        err.code = 'ECONNREFUSED';
        throw err;
      },
    });

    try {
      let threwRefused = false;
      try {
        await sendOtp('test@test.com', '333333');
      } catch (err) {
        threwRefused = true;
        assert.ok(err.message.includes('Connection refused'), 'Expected friendly connection refused message');
      }
      assert.strictEqual(threwRefused, true);
      console.log('✓ Test 4c: ECONNREFUSED error handled');
    } finally {
      nodemailer.createTransport = originalCreateTransport;
    }
  }

  console.log('\nAll tests passed successfully!');
}

runTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
