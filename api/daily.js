module.exports = async function handler(req, res)

const checkinPhrases = [
  "今天我刻意尋求了祂","神與我同行，今日已到","我來了，祂在這裡",
  "今天我選擇信靠","今日我站在祂面前","我今天沒有被日常打敗",
  "我今天轉向了祂","祂是我今天的力量","今天我沒有一個人走",
  "我今天親近了神","今日我刻意回應了祂","今天我帶著信心行動",
  "祂的同在，今天我領受了","今日我選擇了神，不是感覺","我今天沒有偏離",
  "今天我對祂說了真心話","今日我追求，不只觀望","神今天帶著我走",
  "今天我靠的是祂，不是自己","今日已到，感謝祂的同在",
  "我今天沒有放棄尋找祂","今天我先求了祂的國","今日我刻意停下來，轉向祂",
  "今天我把掛慮交給了祂","我今天選擇喜樂，因為祂在",
  "今日我信靠，不憑感覺","今天我的心朝向了祂",
  "今日我不孤單，祂與我同在","今天我沒有靠自己的聰明","今日我領受了祂的憐憫"
];

function getTodayPhrase() {
  const d = new Date();
  const day = Math.floor((d - new Date(d.getFullYear(),0,0))/86400000);
  return checkinPhrases[day % checkinPhrases.length];
}

function getTodayString() {
  const d = new Date();
  const days = ["週日","週一","週二","週三","週四","週五","週六"];
  return `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()} ${days[d.getDay()]}`;
}

function getCacheKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

let cache = {};

export default async function handler(req) {
  const cacheKey = getCacheKey();

  if (cache[cacheKey]) {
    const data = { ...cache[cacheKey], phrase: getTodayPhrase() };
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API Key 未設定' }), { status: 500 });
  }

  const today = getTodayString();
  const prompt = `你是一位深刻的靈修引導者，幫助信徒每天跟隨神。今天是 ${today}。請從詩篇、箴言、先知書、福音書、保羅書信中選一段適合靈修的經文，避免族譜、儀式條文、審判段落。選關於神的愛、信心、追求神、禱告、盼望、倚靠、平安、更新、得勝、同在的主題。然後為一個剛從特會回來、渴望不被日常打敗、想每天刻意跟隨神的信徒寫出：1.早晨提醒(2-3句，淺顯易懂) 2.今日信心行動(1個具體可做的事) 3.晚上反思(1個誠實回顧的問題)。語氣像朋友說話，真實溫暖直接。只回覆JSON：{"scripture":"經文(繁體中文)","ref":"書卷 章:節","morning":"早晨提醒","action":"信心行動","evening":"晚上反思"}`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }]
      })
    });

    const result = await res.json();
    const text = result.content[0].text.trim();
    const json = JSON.parse(text.replace(/```json|```/g, "").trim());

    cache[cacheKey] = json;
    Object.keys(cache).forEach(k => { if (k !== cacheKey) delete cache[k]; });

    return new Response(JSON.stringify({ ...json, phrase: getTodayPhrase() }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });

  } catch(e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
