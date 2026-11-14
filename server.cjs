var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_crypto = __toESM(require("crypto"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_vite = require("vite");
var import_dotenv = __toESM(require("dotenv"), 1);
var import_supabase_js = require("@supabase/supabase-js");
try {
  const envPath = import_path.default.resolve(process.cwd(), ".env");
  if (import_fs.default.existsSync(envPath)) {
    const parsedEnv = import_dotenv.default.parse(import_fs.default.readFileSync(envPath));
    for (const key of Object.keys(parsedEnv)) {
      process.env[key] = parsedEnv[key];
    }
  }
} catch (e) {
  import_dotenv.default.config();
}
var supabaseUrl = (process.env.VITE_SUPABASE_URL || "").replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
var supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || "";
var supabaseServer = supabaseUrl && supabaseAnonKey ? (0, import_supabase_js.createClient)(supabaseUrl, supabaseAnonKey) : null;
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use(import_express.default.json());
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      service: "damdot-clinical-backend",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  });
  app.get("/api/paymob/config", (req, res) => {
    const secretKey = process.env.PAYMOB_SECRET_KEY || "";
    const publicKey = process.env.PAYMOB_PUBLIC_KEY || process.env.VITE_PAYMOB_PUBLIC_KEY || "";
    const isLive = secretKey.startsWith("egy_sk_live_");
    const integrationId = process.env.PAYMOB_INTEGRATION_ID || "";
    const configured = Boolean(secretKey && publicKey && integrationId);
    res.json({
      configured,
      publicKey,
      testMode: !isLive,
      isLive,
      integrationId,
      currency: "EGP",
      supportedMethods: configured ? ["Cards (Visa, Mastercard)"] : []
    });
  });
  app.post("/api/paymob/create-intention", async (req, res) => {
    try {
      const {
        amount,
        // in EGP
        currency = "EGP",
        customer = {},
        billing_data = {},
        items = [],
        orderNumber,
        special_reference,
        orderId
      } = req.body;
      if (!amount || amount <= 0) {
        return res.status(400).json({ error: "Valid amount in EGP is required." });
      }
      let validatedAmount = Number(amount);
      if (supabaseServer && (orderNumber || orderId || special_reference)) {
        try {
          const ref = orderNumber || orderId || special_reference;
          const { data: existingOrder } = await supabaseServer.from("orders").select("total, id, order_number").or(`order_number.eq.${ref},id.eq.${ref}`).maybeSingle();
          if (existingOrder && existingOrder.total != null) {
            const trustedTotal = Number(existingOrder.total);
            if (!isNaN(trustedTotal) && Math.abs(validatedAmount - trustedTotal) > 0.01) {
              console.warn(`[Paymob] Amount mismatch for ${ref}: client sent ${validatedAmount}, trusted total ${trustedTotal}. Using trusted total.`);
              validatedAmount = trustedTotal;
            }
          }
        } catch (e) {
          console.warn("[Paymob] Could not validate amount against order:", e);
        }
      }
      const sanitizePaymobPhone = (rawPhone) => {
        if (!rawPhone || typeof rawPhone !== "string") return "+201000000000";
        const englishDigits = rawPhone.replace(/[٠-٩]/g, (d) => "0123456789"["\u0660\u0661\u0662\u0663\u0664\u0665\u0666\u0667\u0668\u0669".indexOf(d)]);
        const hasPlus = englishDigits.trim().startsWith("+");
        let clean = englishDigits.replace(/[^\d]/g, "");
        if (!clean) return "+201000000000";
        if (hasPlus) {
          clean = "+" + clean;
        } else if (clean.startsWith("01")) {
          clean = "+20" + clean.slice(1);
        } else if (clean.startsWith("201")) {
          clean = "+" + clean;
        } else {
          clean = "+" + clean;
        }
        return clean.slice(0, 15);
      };
      const splitCustomerName = (name, fallbackFirst = "Medical", fallbackLast = "Requester") => {
        if (!name || typeof name !== "string") {
          return { first: fallbackFirst, last: fallbackLast };
        }
        const parts = name.trim().split(/\s+/).filter(Boolean);
        if (parts.length === 0) {
          return { first: fallbackFirst, last: fallbackLast };
        }
        if (parts.length === 1) {
          return { first: parts[0], last: fallbackLast };
        }
        return {
          first: parts[0],
          last: parts.slice(1).join(" ")
        };
      };
      const secretKey = process.env.PAYMOB_SECRET_KEY || "";
      const publicKey = process.env.PAYMOB_PUBLIC_KEY || process.env.VITE_PAYMOB_PUBLIC_KEY || "";
      const integrationIdStr = process.env.PAYMOB_INTEGRATION_ID || "";
      const integrationId = integrationIdStr && !isNaN(Number(integrationIdStr)) ? Number(integrationIdStr) : 0;
      if (!secretKey || !publicKey || !integrationId) {
        return res.status(500).json({ error: "Paymob credentials are not configured. Please set PAYMOB_SECRET_KEY, PAYMOB_PUBLIC_KEY, and PAYMOB_INTEGRATION_ID in environment variables." });
      }
      const amountInCents = Math.round(Number(validatedAmount) * 100);
      if (secretKey && secretKey.startsWith("egy_sk_")) {
        try {
          const paymentMethods = integrationId ? [integrationId] : [];
          const rawFullName = customer.name || customer.full_name || (customer.first_name ? `${customer.first_name} ${customer.last_name || ""}` : "");
          const parsedName = splitCustomerName(rawFullName || billing_data.first_name);
          const firstName = customer.first_name && customer.first_name.trim() || parsedName.first || "Medical";
          const lastName = customer.last_name && customer.last_name.trim() || parsedName.last || "Requester";
          const phone = sanitizePaymobPhone(customer.phone_number || customer.phone || billing_data.phone_number);
          const email = customer.email && customer.email.trim() || billing_data.email && billing_data.email.trim() || "requisition@damdot.eg";
          const uniqueRef = `${(special_reference || orderNumber || "DAM").replace(/[^a-zA-Z0-9_-]/g, "")}-${Date.now().toString().slice(-6)}`;
          const paymobPayload = {
            amount: amountInCents,
            currency,
            payment_methods: paymentMethods,
            items: [
              {
                name: items && items[0] && items[0].name || "Clinical Blood Requisition",
                amount: amountInCents,
                description: `damdot Blood Requisition ${orderNumber || ""}`,
                quantity: 1
              }
            ],
            billing_data: {
              first_name: firstName,
              last_name: lastName,
              phone_number: phone,
              email,
              apartment: billing_data.apartment && String(billing_data.apartment).trim() || "1",
              floor: billing_data.floor && String(billing_data.floor).trim() || "1",
              street: billing_data.street && String(billing_data.street).trim() || "Medical Facility Road",
              building: billing_data.building && String(billing_data.building).trim() || "1",
              city: billing_data.city && String(billing_data.city).trim() || "Cairo",
              country: "EG",
              state: billing_data.state && String(billing_data.state).trim() || "Cairo"
            },
            customer: {
              first_name: firstName,
              last_name: lastName,
              email,
              phone_number: phone
            },
            special_reference: uniqueRef
          };
          const response = await fetch("https://accept.paymob.com/v1/intention/", {
            method: "POST",
            headers: {
              Authorization: `Token ${secretKey}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify(paymobPayload)
          });
          const data = await response.json();
          if (response.ok && (data.client_secret || data.id)) {
            const isLiveKey = secretKey.startsWith("egy_sk_live_");
            const clientSecret = data.client_secret;
            const intentionId = data.id;
            const checkoutUrl = publicKey && clientSecret ? `https://accept.paymob.com/unifiedcheckout/?publicKey=${publicKey}&clientSecret=${clientSecret}` : void 0;
            return res.json({
              success: true,
              isTestMode: !isLiveKey,
              clientSecret,
              publicKey,
              intentionId,
              orderId: data.intention_order_id,
              unifiedCheckoutUrl: checkoutUrl,
              paymentKeys: data.payment_keys
            });
          } else {
            console.warn("[Paymob Live API response non-ok]:", data);
            const detailedMsg = data.detail || data.billing_data && Object.entries(data.billing_data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`).join(" | ") || (data.merchant_order_id ? String(data.merchant_order_id) : "") || "Failed to initialize Paymob live production checkout.";
            return res.status(response.status || 400).json({
              error: detailedMsg,
              data
            });
          }
        } catch (apiErr) {
          console.error("[Paymob] Error calling Paymob API:", apiErr);
          return res.status(500).json({
            error: apiErr.message || "Error communicating with Paymob live payment gateway."
          });
        }
      }
      return res.status(400).json({
        error: "Paymob live credentials are not configured in environment."
      });
    } catch (err) {
      console.error("[Paymob] Internal error creating intention:", err);
      res.status(500).json({ error: err.message || "Internal server error" });
    }
  });
  const processedWebhookTxIds = /* @__PURE__ */ new Set();
  app.post("/api/paymob/webhook", async (req, res) => {
    try {
      const payload = req.body;
      const hmacSecret = process.env.PAYMOB_HMAC_SECRET;
      const receivedHmac = req.query.hmac || req.headers["hmac"];
      console.log("[Paymob Webhook] Received transaction callback:", {
        type: payload?.type,
        txId: payload?.obj?.id,
        success: payload?.obj?.success,
        amount_cents: payload?.obj?.amount_cents,
        currency: payload?.obj?.currency,
        orderId: payload?.obj?.order?.id,
        special_reference: payload?.obj?.order?.merchant_order_id
      });
      if (hmacSecret && payload?.obj) {
        const obj = payload.obj;
        const concatenatedValues = [
          obj.amount_cents,
          obj.created_at,
          obj.currency,
          obj.error_occured,
          obj.has_parent_transaction,
          obj.id,
          obj.integration_id,
          obj.is_3d_secure,
          obj.is_auth,
          obj.is_capture,
          obj.is_refunded,
          obj.is_standalone_payment,
          obj.is_voided,
          obj.order?.id,
          obj.owner,
          obj.pending,
          obj.source_data?.pan,
          obj.source_data?.sub_type,
          obj.source_data?.type,
          obj.success
        ].join("");
        const calculatedHmac = import_crypto.default.createHmac("sha512", hmacSecret).update(concatenatedValues).digest("hex");
        if (!receivedHmac || calculatedHmac.toLowerCase() !== receivedHmac.toLowerCase()) {
          console.error("[Paymob Webhook] HMAC verification FAILED. Rejecting webhook.");
          return res.status(401).json({ error: "Invalid webhook signature" });
        }
        console.log("[Paymob Webhook] HMAC cryptographic verification passed.");
      } else if (hmacSecret && !receivedHmac) {
        console.error("[Paymob Webhook] HMAC secret configured but no signature provided. Rejecting.");
        return res.status(401).json({ error: "Missing webhook signature" });
      }
      const isSuccess = payload?.obj?.success === true;
      const specialRef = payload?.obj?.order?.merchant_order_id;
      const transactionId = payload?.obj?.id ? String(payload.obj.id) : void 0;
      const paymobOrderId = payload?.obj?.order?.id ? String(payload.obj.order.id) : void 0;
      if (transactionId && processedWebhookTxIds.has(transactionId)) {
        console.log(`[Paymob Webhook] Transaction ${transactionId} already processed. Skipping.`);
        return res.json({ received: true, verified: true, duplicate: true, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
      }
      if (isSuccess && specialRef && supabaseServer) {
        try {
          const { data: existingOrder } = await supabaseServer.from("orders").select("*").or(`order_number.eq.${specialRef},id.eq.${specialRef}`).maybeSingle();
          if (existingOrder) {
            const webhookAmount = payload?.obj?.amount_cents ? payload.obj.amount_cents / 100 : null;
            if (webhookAmount !== null && Math.abs(Number(existingOrder.total) - Number(webhookAmount)) > 0.01) {
              console.error(`[Paymob Webhook] Amount mismatch for order ${specialRef}: expected ${existingOrder.total}, got ${webhookAmount}`);
            }
            if (existingOrder.payment_status === "Paid") {
              console.log(`[Paymob Webhook] Order ${specialRef} already marked as Paid.`);
              if (transactionId) processedWebhookTxIds.add(transactionId);
              return res.json({ received: true, verified: true, already_paid: true, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
            }
            await supabaseServer.from("orders").update({
              payment_status: "Paid",
              order_status: existingOrder.order_status === "Order Received" || existingOrder.order_status === "Pending Verification" || existingOrder.order_status === "Verification" ? "Confirmed" : existingOrder.order_status,
              paymob_transaction_id: transactionId,
              paymob_order_id: paymobOrderId,
              updated_at: (/* @__PURE__ */ new Date()).toISOString()
            }).or(`order_number.eq.${specialRef},id.eq.${specialRef}`);
            if (transactionId) processedWebhookTxIds.add(transactionId);
            console.log(`[Paymob Webhook] Supabase updated order ${specialRef} to Paid & Confirmed.`);
          }
        } catch (dbErr) {
          console.warn("[Paymob Webhook] Failed to update Supabase order:", dbErr);
        }
      }
      return res.json({ received: true, verified: true, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
    } catch (err) {
      console.error("[Paymob Webhook] Handler error:", err);
      return res.status(500).json({ error: "Webhook processing error" });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
