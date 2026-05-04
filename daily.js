export const config = { runtime: 'edge' };

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

// 簡單的每日快取 key
function getCacheKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

let cache = {};

export default async function handler(req) {
  const cacheKey = getCacheKey();

  // 已有今日快取
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
  const prompt = `你是一位深刻的靈修引導者，幫助信徒每天跟隨神。

今天是 ${today}。

請從詩篇、箴言、先知書（以賽亞書、耶利米書、彌迦書等）、福音書、保羅書信、或其他適合靈修的聖經段落中，選一段今天適合靈修的經文。

請避免：族譜、儀式條文、審判列國的段落、過度艱深難懂的預言。

請選適合個人靈修的段落：關於神的愛、信心、追求神、禱告、盼望、倚靠、平安、更新、得勝、同在等主題。

然後根據這段經文，為一個剛從特會回來、渴望不被日常打敗、想要每天刻意跟隨神的信徒，寫出：

1. 早晨提醒：2-3句，淺顯易懂，直接說話給這個人，帶出今天要怎麼活在這段經文裡
2. 今日信心行動：1個具體可做的行動，不是感覺，是今天可以做到的事
3. 晚上反思：1個問題，幫助他誠實回顧今天

語氣要像朋友說話，不要太說教，不要太宗教語言，要真實、溫暖、直接。

請用以下JSON格式回覆，不要加任何其他文字：
{
  "scripture": "經文內容（繁體中文）",
  "ref": "書卷 章:節",
  "morning": "早晨提醒內容",
  "action": "今日信心行動內容",
  "evening": "晚上反思問題"
}`;

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

    // 存入快取
    cache[cacheKey] = json;
    // 清理舊快取
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
