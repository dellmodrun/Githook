import{a as e,n as t,r as n}from"./fee-recipients-BCWJWD7z.js";import{n as r}from"./canonical-domain-CVqXwIaw.js";var i=`Githook official channel`,a=`Githook Team`,o={queued:`Queued`,sending:`Submitting`,sent:`Sent · delivery unconfirmed`,delivered:`Delivered to mail server`,not_configured:`Sending service not connected`,not_scheduled:`No automatic notice scheduled`,awaiting_consent:`Awaiting developer opt-in`,no_contact:`No usable public contact`,retrying:`Retry scheduled`,failed:`Could not send`,unknown:`Delivery uncertain · no duplicate sent`,opted_out:`Developer opted out`,expired:`Notification expired`},s=(e,t=!0)=>({version:1,site:r,intent:`developer-notifications`,githubId:e,email:t});function c(n){return e(n)?.contributors||t(n)}var l=(e,t=180)=>e.replace(/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g,` `).replace(/\s+/g,` `).trim().slice(0,t);function u(e,t){if(e.status!==`routed`||!e.createSignature)throw Error(`The coin and creator-fee route must be confirmed before outreach.`);let i=l(t.login,39),o=l(e.name,32),s=l(e.symbol,13),c=l(e.fullName,140),u=`${r}/token/${encodeURIComponent(e.mint)}`,d=`${r}/claim?github=${encodeURIComponent(t.login)}`,f=`https://pump.fun/coin/${encodeURIComponent(e.mint)}`,p=t.shareBps?`${c}: a community coin has assigned creator rewards to you`:`${c}: an invitation to its Githook project room`,m=`Hi @${i},

A community member launched ${o} ($${s}) through Githook to support the next chapter of ${c}. Githook’s AI team reviews the unfinished work, proposes a focused milestone and keeps the discussion with the coin.

Githook connects unfinished GitHub projects, AI agents and communities willing to support their cause. This coin was launched independently; it is not an official project token and does not imply your endorsement.

WHAT THIS MEANS FOR YOU
${t.shareBps?`Your GitHub account @${i} (ID ${t.id}) is assigned ${n(t.shareBps)} of this coin's distributable creator fees. These fees come from eligible trading activity on Pump. Rewards may be zero, and a fee allocation does not mean a claimable balance is already available.`:`The saved funding plan gives your account no direct creator-fee allocation from this coin. You are invited to review the project direction and decide whether to participate.`}

${e.routeKind===`hatch_split_v1`?`The saved allocation reserves 20% for the Githook treasury. The remaining 80% follows the exact saved allocation shown on the coin page. New launches assign the full 80% to eligible GitHub developers; historical coins keep their original allocation. These percentages were fixed at launch.`:``}

You can reply to Githook official channel with your priorities, corrections or interest in joining the discussion. This email is an invitation; receiving it does not enroll you or authorize changes to your repository.

You do not need to buy the coin, invest your own money, pay Githook, or promote it. Githook charges no fee to inspect your allocation or access the claim guide. Sharing is optional and is never a condition of claiming eligible rewards.

YOUR COIN DETAILS
Name: ${o}
Ticker: $${s}
Solana contract: ${e.mint}
Project: https://github.com/${c}
Coin and verified fee route: ${u}
Official Pump coin page: ${f}

${t.shareBps?`HOW TO CHECK AND CLAIM`:`HOW TO INSPECT THE PROJECT`}
1. Visit https://pump.fun directly, or use the official Pump app linked from that site. Open the coin above and check that its contract matches this email.
${t.shareBps?`2. Open Pump's Creator Rewards / Claim flow. Follow Pump's prompts to sign in and link or verify the GitHub account @${i} that is named in the fee allocation. Use a wallet you control if Pump requests one.
3. Review any eligible balance, the destination wallet, and any fees shown by Pump. If you choose to claim, complete the claim in Pump itself. Pump's eligibility requirements and any applicable network fees still apply.`:`2. Read the mission and funding plan on the Githook coin page.
3. Reply to this email if you want to contribute, correct the record or decline further contact.`}

Developer guide: ${d}

You are free to support this coin, other coins, or none. A claim does not require a promotional post. Githook does not hold these rewards and will never ask for your recovery phrase or a payment to unlock them.

Questions? Reply to this email and we can help you understand the launch details.

${a}
${r}`,h=`Hi @${i} — a community member launched ${o} ($${s}) around ${c} through Githook.\n\nThe verified fee route assigns your GitHub account ${n(t.shareBps)} of future distributable Pump creator fees. Rewards depend on trading and may be zero. This does not imply your endorsement.\n\nNo coin purchase or payment to Githook is needed. Link your own GitHub account and inspect/claim eligible rewards through Pump; its claim rules and any network fees apply. Sharing the coin is entirely optional.\n\nToken + route: ${u}\nClaim guide: ${d}\nPump: ${f}\nContract: ${e.mint}\n\nReply GITHOOK STOP to stop automated DMs. Never share a recovery phrase. Privacy: ${r}/notifications/privacy`;return{subject:p,text:m,dm:h,manualDm:h.replace(`Reply GITHOOK STOP to stop automated DMs. `,``),tokenUrl:u,claimUrl:d,pumpUrl:f}}export{s as a,u as i,a as n,c as o,o as r,i as t};