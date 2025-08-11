import React, { useEffect, useState } from "react";

// Point to your backend (env in Vercel). Falls back to localhost for dev.
const API_BASE = (import.meta.env.VITE_API_BASE || "http://localhost:3000") + "/api";

const quotes = { BTCUSD: 68000, ETHUSD: 3600, USDCUSD: 1 };

const Section = ({ title, children }) => (
  <div style={{maxWidth:960, margin:"20px auto", padding:"16px", border:"1px solid #e5e7eb", borderRadius:12}}>
    <h2 style={{marginTop:0}}>{title}</h2>
    {children}
  </div>
);

export default function App() {
  const [issuer] = useState({
    name: "Acme Robotics, Inc.",
    exemption: "Reg D 506(c)",
    pricePerShareUSD: 5,
    minInvestmentUSD: 5000,
    walletPolicy: { assets: ["USDC","BTC","ETH"] }
  });

  const [offer, setOffer] = useState({ id: "seed-1", title: "Seed Round" });
  const [investor, setInvestor] = useState({ name:"", email:"", country:"US" });
  const [asset, setAsset] = useState("USDC");
  const [amount, setAmount] = useState(issuer.minInvestmentUSD);

  const [kyc, setKyc] = useState({ passed:false, ref:null });
  const [acc, setAcc] = useState({ verified:false, ref:null });
  const [pay, setPay] = useState({ created:false, confirmed:false, ref:null });
  const [issued, setIssued] = useState(false);
  const [docLink, setDocLink] = useState(null);

  const price = issuer.pricePerShareUSD;
  const shares = Math.floor((amount/price)*1000)/1000;
  const needAsset = Math.round((amount/(quotes[asset+"USD"]||1))*1e8)/1e8;

  const canCheckout = investor.name && investor.email && amount>=issuer.minInvestmentUSD && kyc.passed && acc.verified;

  const post = async (path, body) => {
    const r = await fetch(`${API_BASE}/${path}`, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(body) });
    return r.json();
  };

  const startKyc = async () => {
    const resp = await post("kyc/start", { email: investor.email, name: investor.name });
    setKyc({ passed:true, ref: resp.referenceId });
  };

  const startAccredit = async () => {
    const resp = await post("accredit/start", { email: investor.email });
    setAcc({ verified:true, ref: resp.referenceId });
  };

  const checkout = async () => {
    const c = await post("payments/checkout", { asset, amount: needAsset, amountUSD: amount, offerId: offer.id, email: investor.email });
    const w = await post("payments/webhook", { txid: c.referenceId, confirmations: 12 });
    setPay({ created:true, confirmed:true, ref: w.referenceId });

    const i = await post("captable/issue", { investor: investor.email, shares, price, offerId: offer.id });
    setIssued(true);

    const d = await post("documents/compliance-pack", { investor: investor.email, shares, price, offerId: offer.id, txRef: w.referenceId });
    setDocLink(d.downloadUrl || null);
  };

  return (
    <div style={{fontFamily:"system-ui, -apple-system, Segoe UI, Roboto, Arial", padding:"20px"}}>
      <h1>Startup Raise — Frontend</h1>
      <p style={{color:"#475569"}}>Backend: <code>{API_BASE.replace("/api","")}</code></p>

      <Section title="Overview">
        <ul>
          <li>Reg D 506(c) demo — accredited-only</li>
          <li>Pay with USDC/BTC/ETH; shares calculated automatically</li>
          <li>Simulated KYC, accreditation, payment, issuance, and Compliance Pack</li>
        </ul>
      </Section>

      <Section title="Investor Portal">
        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:12}}>
          <div>
            <label>Name<br/>
              <input value={investor.name} onChange={e=>setInvestor({...investor, name:e.target.value})} style={inp}/>
            </label>
          </div>
          <div>
            <label>Email<br/>
              <input value={investor.email} onChange={e=>setInvestor({...investor, email:e.target.value})} style={inp}/>
            </label>
          </div>
          <div>
            <label>Payment Asset<br/>
              <select value={asset} onChange={e=>setAsset(e.target.value)} style={inp}>
                {issuer.walletPolicy.assets.map(a=> <option key={a} value={a}>{a}</option>)}
              </select>
            </label>
          </div>
          <div>
            <label>Investment Amount (USD) — min ${issuer.minInvestmentUSD.toLocaleString()}<br/>
              <input type="number" value={amount} min={issuer.minInvestmentUSD} onChange={e=>setAmount(Number(e.target.value)||0)} style={inp}/>
            </label>
          </div>
        </div>

        <div style={{marginTop:12, fontSize:14}}>
          Price/Share: ${price} • Estimated Shares: <b>{shares.toLocaleString()}</b> • Send ≈ <b>{needAsset} {asset}</b>
        </div>

        <div style={{display:"flex", gap:8, marginTop:12}}>
          <button onClick={startKyc} style={btn(kyc.passed)}>{kyc.passed ? "KYC Passed ✓" : "Start KYC"}</button>
          <button onClick={startAccredit} style={btn(acc.verified)}>{acc.verified ? "Accredited ✓" : "Verify Accredited"}</button>
          <button onClick={checkout} disabled={!canCheckout} style={btn(canCheckout && !pay.confirmed)}>{pay.confirmed ? "Payment Confirmed ✓" : "Checkout & Pay"}</button>
        </div>

        <ol style={{marginTop:12}}>
          <li><b>KYC</b> {kyc.passed ? "✓" : "…"}</li>
          <li><b>Accredited</b> {acc.verified ? "✓" : "…"}</li>
          <li><b>Payment</b> {pay.confirmed ? "✓" : "…"}</li>
          <li><b>Shares Issued</b> {issued ? "✓" : "…"}</li>
        </ol>

        {docLink && (
          <p>Compliance Pack: <a href={docLink} target="_blank" rel="noreferrer">Download (stub)</a></p>
        )}
      </Section>

      <Section title="Disclosures">
        <ul>
          <li>High-risk investment; you could lose all capital.</li>
          <li>Restricted securities; illiquid.</li>
          <li>Reg D 506(c): accredited investors only (verified).</li>
          <li>Crypto payments auto-converted to USD per policy.</li>
        </ul>
      </Section>
    </div>
  );
}

const inp = { width:"100%", padding:"10px", border:"1px solid #cbd5e1", borderRadius:8 };
const btn = (active) => ({
  padding:"10px 14px",
  border:"1px solid #cbd5e1",
  borderRadius:8,
  background: active ? "#6366f1" : "#f1f5f9",
  color: active ? "#fff" : "#111827",
  cursor:"pointer",
  opacity: active ? 1 : undefined
});
