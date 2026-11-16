/* Agreements Quiet Media signs with clients. Studio shows one here, Samuel signs it, and the text (exactly as below) is stored
   with a fingerprint. The client opens and signs it on sheets.quietmedia.co.uk/agreement/.
   Once an agreement has been sent, its stored text never changes: editing this file only affects agreements created afterwards.
   QMAgreements.CSS is also copied into the sheets page (agreement/index.html); keep the two in step. */
(function(root){
const QM='<b>Quiet Media Ltd</b> (“Quiet Media”)<br>Company number 13641168<br>Registered office c/o Anderson + Anderson Accountancy Services Ltd, Wittas House, Two Rivers, Station Lane, Witney, Oxfordshire, OX28 4BH<br>Represented by Samuel Hosier, Director';
const INC='<b>International Collective Ltd</b> (“I.N.C”)<br>Company number 16861833<br>Registered office Brandon House, First Floor, 90 The Broadway, Chesham, Bucks. HP5 1EG<br>Represented by Christopher Manoe, Director';
const head=(title,a,b)=>'<header class="qa-head"><p class="qa-eye">The I.N.C Directory</p><h1>'+title+'</h1><p class="qa-sub">Between Quiet Media Ltd and International Collective Ltd</p></header>'+
  '<div class="qa-parties"><div class="qa-box"><p class="qa-lab">'+a+'</p><p>'+QM+'</p></div><div class="qa-box"><p class="qa-lab">'+b+'</p><p>'+INC+'</p></div></div>';
const sec=(n,t)=>'<h2><span>'+n+'</span> '+t+'</h2>';
const rows=(h,r)=>'<table class="qa-tbl"><thead><tr>'+h.map(x=>'<th>'+x+'</th>').join('')+'</tr></thead><tbody>'+r.map(x=>'<tr>'+x.map((y,i)=>'<td data-l="'+h[i]+'">'+y+'</td>').join('')+'</tr>').join('')+'</tbody></table>';

const DPA=head('Data Processing Agreement','Processor','Controller')+
sec(1,'The parties and what this covers')+
'<p>This agreement covers the personal data in the I.N.C Directory: who is responsible for it, and what Quiet Media commits to when handling it. Ownership of the Directory and the monthly retainer are in a separate Services and Licence Agreement.</p>'+
'<p><b>The Directory</b> means the I.N.C Directory at inc-directory.com and everything that runs it:</p>'+
'<ul><li>its pages, code and database design</li><li>its server functions</li><li>its links (briefs, call sheets, booking forms, portals)</li><li>its backup tools</li><li>the parts of I.N.C’s websites that read from it</li></ul>'+
'<p>It does not mean I.N.C’s data, which is always I.N.C’s.</p>'+
'<p><b>Start date.</b> This agreement starts on the date of the last signature. It covers all work Quiet Media has already done on the Directory as well as future work.</p>'+
'<p><b>What it replaces.</b> It replaces the draft data processing agreement of 10 November 2026. It sits alongside I.N.C’s Data Protection Policy (version 2.0) and the Services and Licence Agreement. Where they differ on how personal data is handled, this agreement applies.</p>'+
sec(2,'Who is responsible for the data')+
'<p><b>I.N.C is the controller</b> of all personal data in the Directory. <b>Quiet Media is its processor.</b> I.N.C decides what data is kept, why, for how long and who sees it. Quiet Media builds and runs the system that holds it, on I.N.C’s instructions.</p>'+
rows(['Decision or duty','Whose'],[
 ['What personal data is collected, and the legal basis for each use','I.N.C'],
 ['Privacy notices, consent (allergies and diet, emails), and telling people how their data is used','I.N.C'],
 ['Who has a login, their role, and what each person can see','I.N.C (Quiet Media sets it up as asked)'],
 ['What staff, agents and freelancers do with data once they can see it: sending briefs, links, screenshots, WhatsApp, Canva, local copies','I.N.C'],
 ['Answering people’s requests, and deciding whether to report a breach to the ICO','I.N.C (Quiet Media helps, section 3)'],
 ['The ICO fee, I.N.C’s policy and records, and agreements with I.N.C’s own freelancers','I.N.C'],
 ['Building the Directory securely, and keeping it secure and backed up','Quiet Media'],
 ['Handling the data only as instructed, keeping it confidential, and telling I.N.C of a breach','Quiet Media']])+
'<p><b>I.N.C’s instructions</b> are this agreement, I.N.C’s Data Protection Policy, the standing instruction below, and written requests from I.N.C’s director or anyone the director names in writing. An email, a message or a change request in the Directory counts as written.</p>'+
'<div class="qa-call"><p><b>The standing instruction.</b> I.N.C instructs Quiet Media, generally and on an ongoing basis, to maintain, secure, fix and improve the Directory as Quiet Media judges best for I.N.C, within the purposes in this agreement. Quiet Media doesn’t need I.N.C’s approval for each change. Every change Quiet Media makes and merges under this instruction is authorised by I.N.C.</p>'+
'<p><b>Keeping I.N.C informed.</b> Quiet Media tells I.N.C about changes through the update notes in the Directory (Settings &gt; Updates), sent quietly for small fixes and with a short tour for bigger changes, including every change request it completes. These notes are the record of what has changed, and I.N.C agrees they are enough notice. Behind-the-scenes work the team wouldn’t notice, such as security fixes, is kept in the Directory’s change history, which Quiet Media will show I.N.C on request. I.N.C may ask for any change to be reversed or adjusted at any time, and Quiet Media will do so under the retainer at no extra charge.</p></div>'+
'<p><b>What still needs I.N.C’s agreement first.</b> These need a yes from I.N.C’s director, by email or message, before Quiet Media does them:</p>'+
'<ul><li>collecting a new kind of personal data, or using personal data for a new purpose</li><li>adding a new outside service that will handle personal data (section 3)</li><li>emailing or messaging people in bulk on I.N.C’s behalf</li><li>deleting or changing live records, other than under the agreed retention rules, the Data Protection Policy, or to fix a fault</li><li>changing who can see private details, fees or the most sensitive information</li></ul>'+
'<p><b>Quiet Media’s advice.</b> Quiet Media may point out data protection risks and suggest fixes. It did so in the November 2026 review. Advice is given in good faith, but it is not legal advice. Whether to follow it, and any legal sign-off, remains I.N.C’s decision.</p>'+
sec(3,'What Quiet Media commits to with the data')+
'<p>These are the terms UK GDPR Article 28 requires between a controller and its processor.</p>'+
'<div class="qa-call"><p class="qa-lab">The processing</p><p><b>Subject:</b> building, hosting, maintaining, supporting, securing and backing up the Directory.</p><p><b>People it covers:</b> talent, Circle members, choreographers and creatives, crew and freelancers, client contacts, applicants, I.N.C staff and emergency contacts.</p><p><b>Types of data:</b> as listed in section 3 of I.N.C’s Data Protection Policy.</p><p><b>Special category data:</b> allergies and dietary needs only.</p><p><b>How long:</b> for as long as this agreement lasts.</p></div>'+
'<p>Quiet Media will:</p><ol>'+
'<li><b>Follow instructions.</b> Use the data only for the Directory and on I.N.C’s instructions, never for its own purposes, and say so if an instruction seems unlawful.</li>'+
'<li><b>Keep it confidential.</b> Anyone at Quiet Media who can reach the data is bound to confidentiality.</li>'+
'<li><b>Keep it secure.</b> At least:<ul><li>database rules that limit each login to what its role allows</li><li>two-step sign-in available to every login</li><li>regular backups, kept in private storage that only Quiet Media can reach</li><li>secret keys kept out of the code</li><li>changes tested on made-up data first, where it’s practical to</li><li>logged access to the most private details</li></ul></li>'+
'<li><b>Leave live data alone.</b> Read live records only as needed for the work, and never change or delete them except as I.N.C asks or as section 2 allows.</li>'+
'<li><b>Use only approved sub-processors.</b> I.N.C approves those listed in section 6 of its Data Protection Policy, including Anthropic (Claude), which Quiet Media uses to build and maintain the Directory under terms that exclude training on the data. Quiet Media tells I.N.C before adding a new one, and I.N.C may object within 14 days.</li>'+
'<li><b>Help with requests.</b> Pull together a person’s data from the Directory within 10 working days of being asked, and delete or correct it as I.N.C instructs.</li>'+
'<li><b>Report breaches.</b> Tell I.N.C’s data protection lead within 24 hours of becoming aware of a breach affecting I.N.C’s data, with what is known and what has been done.</li>'+
'<li><b>Assist.</b> Help with security, impact assessments and any ICO enquiry, as far as the Directory is concerned.</li>'+
'<li><b>Show its work.</b> Keep a record of the processing it does for I.N.C, and allow reasonable audits on reasonable notice, at I.N.C’s cost.</li></ol>'+
'<p><b>Outside the UK.</b> Quiet Media sends personal data outside the UK only to approved sub-processors covered by the UK–US Data Bridge, the UK International Data Transfer Agreement, or the UK Addendum.</p>'+
sec(4,'What I.N.C commits to')+
'<p>I.N.C will:</p><ol>'+
'<li><b>Have a legal basis.</b> Hold a lawful basis for every piece of personal data it puts into the Directory or asks Quiet Media to process. That includes consent where needed, for allergies, dietary needs and marketing emails.</li>'+
'<li><b>Tell people.</b> Keep its privacy notice up to date and give it to the people whose data it holds.</li>'+
'<li><b>Control its own people.</b> Decide who gets a login and at what level. Remove logins the day someone leaves. Make sure everyone with access has signed the acknowledgement in its Data Protection Policy, and has a written agreement if they’re a freelancer.</li>'+
'<li><b>Use the Directory as intended.</b> Not put data into it that the policy says not to keep, such as ethnicity, health beyond allergies, or bank details, including in free-text notes. Not ask Quiet Media to process data unlawfully.</li>'+
'<li><b>Look after its accounts.</b> Use two-step sign-in for every staff login and keep passwords private. The same goes for I.N.C’s own accounts with the services the Directory uses (Supabase, Resend, Twilio, Xero, Circle and the rest). Tell Quiet Media at once if a login may have been compromised.</li>'+
'<li><b>Not work around the Directory.</b> Not change its code, database, settings or keys, or give anyone else access to them, without telling Quiet Media first.</li>'+
'<li><b>Run the business side.</b> Pay the ICO fee, keep its own records, answer people’s requests and complaints, and make the decision on reporting breaches.</li></ol>'+
sec(5,'Limits of liability')+
'<p>Each party is responsible for its own part. Quiet Media’s liability is capped once across both agreements. The cap is the fees I.N.C paid it in the 12 months before the claim, so at most £12,000 at the current retainer.</p>'+
'<p><b>One cap for both agreements.</b> Quiet Media’s total liability to I.N.C, under this agreement and the Services and Licence Agreement together, is limited to the total fees I.N.C paid Quiet Media in the 12 months before the event that caused the claim. That covers every claim, however it arises: contract, negligence or breach of data protection law. Anything already paid out on an earlier claim counts towards it.</p>'+
'<p><b>Losses not covered.</b> Neither party is liable for:</p><ul><li>loss of profit, business, revenue or goodwill</li><li>loss of anticipated savings</li><li>any indirect or consequential loss</li></ul>'+
'<p>For lost or damaged data, Quiet Media’s duty is to restore it from the most recent backup.</p>'+
'<p><b>What Quiet Media isn’t liable for.</b> Anything caused by:</p><ul><li>I.N.C’s instructions, or data I.N.C put in without a lawful basis</li><li>what I.N.C’s staff, agents, freelancers or clients do with data they can see or are sent: a brief to the wrong client, a forwarded link, a WhatsApp message, a Canva design, a copy on a laptop</li><li>a login or account of I.N.C’s being misused or compromised</li><li>a change I.N.C, or someone acting for it, made without Quiet Media</li><li>the failure of a third-party service the Directory runs on, unless Quiet Media chose it against I.N.C’s instructions</li><li>I.N.C not following Quiet Media’s written advice</li></ul>'+
'<div class="qa-call"><p><b>Work under the standing instruction.</b> Quiet Media makes improvements in good faith and in I.N.C’s interests, often without being asked. It isn’t liable for the effects of a change made under the standing instruction (section 2), except where it acted with gross negligence or deliberately. I.N.C’s remedy for a change it doesn’t want is to have it reversed or adjusted, which Quiet Media does promptly at no extra charge. Any liability that remains is within the cap.</p></div>'+
'<p><b>I.N.C covers Quiet Media</b> for its reasonable losses and costs, including fines, claims by individuals and legal costs, arising from any of the things listed just above.</p>'+
'<p><b>Quiet Media covers I.N.C</b> for its reasonable losses arising from Quiet Media processing personal data in breach of section 3. This is within the cap.</p>'+
'<p><b>What can’t be limited.</b> Nothing here limits liability for death or personal injury caused by negligence, for fraud, or for anything else the law doesn’t allow to be limited.</p>'+
'<p><b>Insurance.</b> Quiet Media holds professional indemnity insurance. Holding it doesn’t raise the cap.</p>'+
sec(6,'Ending the agreement, and signatures')+
'<p><b>How long it lasts.</b> This agreement lasts as long as Quiet Media handles personal data for I.N.C. It ends when the Services and Licence Agreement ends and the steps below are done.</p>'+
'<p><b>When it ends:</b></p><ol><li>Within 30 days, Quiet Media hands I.N.C a full copy of its data, as I.N.C chooses: the database, files and photos.</li><li>Within 30 days of that handover, Quiet Media deletes all I.N.C data it holds, including backups it controls, and confirms this in writing. It keeps only what the law requires it to keep.</li><li>Sections 2, 3 (while Quiet Media holds any data), 5 and 6 continue after it ends.</li></ol>'+
'<p><b>Confidentiality.</b> Each party keeps the other’s business information confidential during this agreement and after it ends.</p>'+
'<p><b>Changes.</b> Changes to this agreement are valid only in writing, signed or agreed by email by both parties.</p>'+
'<p><b>Law.</b> This agreement is governed by the law of England and Wales, and its courts decide any dispute. The parties will first try to settle a dispute by talking in good faith for 30 days.</p>';

const SLA=head('Services and Licence Agreement','Developer','Client')+
sec(1,'The parties and what this covers')+
'<p>This agreement sets out who owns the I.N.C Directory’s code, what International Collective may do with the Directory, and what the monthly retainer covers. Personal data is dealt with separately, in the Data Processing Agreement between the same parties.</p>'+
'<p><b>The Directory</b> means the I.N.C Directory at inc-directory.com and the software that runs it:</p>'+
'<ul><li>its pages and code</li><li>its database structure and server functions</li><li>its links (briefs, call sheets, booking forms, portals)</li><li>its backup tools</li><li>the parts of I.N.C’s websites that read from it</li></ul>'+
'<p><b>Start date.</b> This agreement starts on the date of the last signature. It covers all the work Quiet Media has already done on the Directory, as well as future work. I.N.C paid Quiet Media day rates for that earlier work. Those payments were for Quiet Media’s time; they weren’t a purchase of the software.</p>'+
sec(2,'Who owns what')+
'<p>Quiet Media owns the Directory’s code. I.N.C owns everything it supplied and everything put into the Directory. This agreement doesn’t decide who owns the overall visual design.</p>'+
'<p><b>Quiet Media owns</b> the software it wrote:</p><ul><li>the code</li><li>the database structure</li><li>the server functions</li><li>its own tools and methods</li><li>the improvements it makes to them</li></ul>'+
'<p>Quiet Media may reuse its general tools, methods and building blocks in other work. It may never reuse I.N.C’s material (below) or anything that identifies I.N.C or its people.</p>'+
'<p><b>I.N.C owns</b> what it supplied or put in:</p><ul><li>its brands, logos, artwork, colours and wording supplied for the Directory</li><li>the personal data, photos and documents in it</li><li>its client, job and booking records</li></ul>'+
'<p><b>The visual design.</b> The Directory’s look combines material I.N.C supplied with work Quiet Media did. Each keeps whatever rights it has in its own contribution. This agreement doesn’t decide ownership of the design as a whole. Either way, I.N.C may keep using it as part of its licence (section 3).</p>'+
sec(3,'I.N.C’s licence')+
'<p>I.N.C has a permanent licence to use the Directory in its own business, which Quiet Media can’t take back over a money dispute. The licence is for I.N.C, not for a buyer. If the business is sold, the buyer needs its own deal with Quiet Media.</p>'+
'<p><b>What it allows.</b> Quiet Media grants I.N.C, and the brands and companies in the International Collective group, a licence to use the Directory for their own business. It also lets them keep it running and adapt it, themselves or through another developer if Quiet Media stops working on it.</p>'+
'<p><b>What kind of licence it is.</b></p><ul><li><b>Permanent:</b> it continues after the retainer ends.</li><li><b>Royalty-free:</b> there is no separate licence fee; the day rates already paid and the retainer cover it.</li><li><b>Non-exclusive:</b> Quiet Media can still use its own code and tools elsewhere, as section 2 allows.</li><li><b>Not transferable:</b> it can’t be sold or passed to a business outside the group without Quiet Media’s written agreement.</li></ul>'+
'<p><b>New work.</b> Work under the retainer, and extra paid work, joins the licence once the invoice for it is paid.</p>'+
'<p><b>It can’t be withdrawn</b> except as set out below if I.N.C is sold. If there’s a dispute about money, Quiet Media’s remedy is to claim what’s owed, never to switch the Directory off or withhold access.</p>'+
'<p><b>If I.N.C is sold.</b> The licence doesn’t pass to anyone else. That covers I.N.C’s business or brands being sold, and anyone new taking control of I.N.C, for example by buying a majority of its shares. If I.N.C, or the person selling it, wants the Directory to go with the sale, there are two options:</p>'+
'<ul><li>the buyer takes a licence from Quiet Media, or</li><li>the buyer buys the Directory’s code from Quiet Media outright</li></ul>'+
'<p>The price is agreed between them. If they can’t agree within 60 days, it’s the fair market value set by an independent software valuer they both accept, with the cost shared equally. Without such a deal, the licence ends 90 days after the sale completes. Within those 90 days Quiet Media hands back all of I.N.C’s data under the Data Processing Agreement, so the new owners can carry on with it.</p>'+
'<p><b>I.N.C will tell Quiet Media</b> in confidence as soon as a sale is likely, so this can be agreed as part of it.</p>'+
sec(4,'The retainer')+
'<p>I.N.C pays Quiet Media <b>£1,000 a month</b> plus VAT to keep the Directory running and improve it reasonably. The retainer pays for looking after the Directory, not for a set number of hours. Anything beyond it is extra paid work, as set out below.</p>'+
'<p><b>Payment.</b> Quiet Media invoices at the start of each month, and I.N.C pays within 14 days. Quiet Media may review the fee once a year, giving 2 months’ written notice.</p>'+
'<p><b>Monthly report.</b> With each invoice, Quiet Media sends a summary of the fixes, improvements and change requests it completed in the previous month.</p>'+
rows(['Included in the retainer','Extra paid work, agreed first'],[
 ['Fixing faults and anything that stops working','New features, new pages or new tools'],
 ['Security updates, and keeping the services it runs on up to date','Connecting a new outside service (a new payment, email, AI or booking system)'],
 ['Watching the backups, and restoring from them when needed','Importing or moving large amounts of data, beyond routine Tagmin and Circle syncs'],
 ['Small improvements and adjustments to features that already exist, including the team’s change requests of that kind','Work on websites other than the Directory'],
 ['Helping the team use the Directory','Rebuilding an existing feature in a substantially different way'],
 ['The data protection support set out in the Data Processing Agreement','Work caused by I.N.C, or anyone acting for it, changing the code, database or settings without Quiet Media']])+
'<p><b>Extra work rate.</b> Extra paid work is charged at <b>£50 an hour</b> plus VAT for the time Quiet Media spends on it. Quiet Media may change this rate by giving 2 months’ written notice.</p>'+
'<p><b>How a request is handled.</b> For each change request, Quiet Media says whether it’s within the retainer or extra. Extra work is quoted in writing (an email is enough) and starts only once I.N.C agrees. If they disagree about which it is, they talk it through in good faith. Quiet Media doesn’t have to start it until they agree.</p>'+
'<p><b>Work Quiet Media chooses to do.</b> Improvements Quiet Media makes on its own initiative under the standing instruction in the Data Processing Agreement are part of the retainer, unless Quiet Media tells I.N.C in writing before starting that the work will be charged as extra, with an estimate. An email or message is enough. If I.N.C doesn’t say no within 3 working days, the work may go ahead and is charged at the extra work rate.</p>'+
'<p><b>Quiet months.</b> After 3 months in a row in which the monthly reports show only fault fixes and no improvements, I.N.C may use up to 1 day (7 hours) of Quiet Media’s time on other work, such as editing, in the following month, at no extra charge. The count then starts again. Unused time doesn’t carry over.</p>'+
'<p><b>What “reasonable” means.</b> Quiet Media decides the order of retainer work, putting faults and security first. No set number of hours is promised. Response times are best effort, usually within 1 working day for a fault that stops the team working.</p>'+
'<p><b>Quiet Media isn’t responsible</b> for downtime or faults in the services the Directory runs on (Supabase, Netlify, Resend, Twilio and the others). It will help restore service.</p>'+
sec(5,'Limits of liability')+
'<p>The single liability cap set out in the Data Processing Agreement (section 5) covers this agreement too. Quiet Media’s total liability under both agreements together is never more than the fees I.N.C paid it in the 12 months before the claim.</p>'+
'<p><b>Losses not covered.</b> Neither party is liable for:</p><ul><li>loss of profit, business, revenue or goodwill</li><li>loss of anticipated savings</li><li>any indirect or consequential loss</li></ul>'+
'<p><b>What Quiet Media isn’t liable for.</b> Anything caused by:</p><ul><li>a change I.N.C, or someone acting for it, made to the Directory without Quiet Media</li><li>the failure of a third-party service the Directory runs on</li><li>I.N.C not following Quiet Media’s written advice</li></ul>'+
'<p><b>Quiet Media’s assurance.</b> Quiet Media confirms the code it wrote is its own to license. It will cover I.N.C, within the cap, if a third party successfully claims that code infringes their rights. This doesn’t apply to material I.N.C supplied, or to the visual design.</p>'+
'<p><b>What can’t be limited.</b> Nothing here limits liability for death or personal injury caused by negligence, for fraud, or for anything else the law doesn’t allow to be limited.</p>'+
sec(6,'Ending the agreement, and signatures')+
'<p><b>Notice.</b> Either party may end the retainer with 3 months’ written notice. Either may end it at once if the other seriously breaks this agreement and doesn’t put it right within 30 days of being told. Unpaid invoices more than 30 days late count as a serious breach.</p>'+
'<p><b>When it ends,</b> I.N.C keeps its licence (section 3). Within 30 days, Quiet Media hands over what I.N.C needs to carry on: the code, the instructions for running and restoring the Directory, and control of any accounts Quiet Media holds for it. The return and deletion of personal data follow the Data Processing Agreement. Sections 2, 3, 5 and 6 continue after the end.</p>'+
'<p><b>Confidentiality.</b> Each party keeps the other’s business information confidential, during this agreement and after it ends.</p>'+
'<p><b>Changes.</b> Changes to this agreement are valid only in writing, signed or agreed by email by both parties.</p>'+
'<p><b>Law.</b> This agreement is governed by the law of England and Wales, and its courts decide any dispute. The parties will first try to settle a dispute by talking in good faith for 30 days.</p>';

const CSS=`
.qa{--qa-ink:#111;--qa-muted:#6E655E;--qa-soft:#F1EFEC;--qa-line:rgba(10,10,10,.1);--qa-accent:#B08D57;color:var(--qa-ink);font-family:'DM Sans','Helvetica Neue',Arial,sans-serif;font-weight:300;font-size:15px;line-height:1.65}
.qa *{box-sizing:border-box}
.qa p,.qa ul,.qa ol,.qa h1,.qa h2{margin:0}
.qa b{font-weight:500}
.qa .qa-head{margin:8px 0 28px}
.qa .qa-eye,.qa .qa-lab{font-size:11px;font-weight:500;letter-spacing:.14em;text-transform:uppercase;color:var(--qa-muted)}
.qa h1{font-size:clamp(30px,6vw,46px);font-weight:300;letter-spacing:-1.2px;line-height:1.05;margin:10px 0 8px;text-wrap:balance}
.qa .qa-sub{color:var(--qa-muted);font-size:16px}
.qa .qa-parties{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,250px),1fr));gap:10px;margin-bottom:34px}
.qa .qa-box{background:var(--qa-soft);border-radius:16px;padding:18px 20px;break-inside:avoid}
.qa .qa-box .qa-lab{margin-bottom:8px}
.qa .qa-box p+p{font-size:14px;line-height:1.75}
.qa h2{font-size:23px;font-weight:300;letter-spacing:-.4px;margin:34px 0 12px;break-after:avoid}
.qa h2 span{color:var(--qa-accent)}
.qa p+p,.qa ul+p,.qa ol+p,.qa p+ul,.qa p+ol,.qa .qa-call,.qa .qa-tbl,.qa p+.qa-call,.qa .qa-tbl+p,.qa .qa-call+p{margin-top:12px}
.qa ul,.qa ol{padding-left:22px}
.qa li{margin:4px 0}.qa li::marker{color:var(--qa-muted)}
.qa li ul{margin-top:4px;list-style:circle}
.qa .qa-call{background:var(--qa-soft);border-radius:16px;padding:18px 20px;break-inside:avoid}
.qa .qa-call p+p{margin-top:10px}
.qa .qa-call .qa-lab+p{margin-top:8px}
.qa .qa-tbl{width:100%;border-collapse:separate;border-spacing:0 6px;font-size:14px}
.qa .qa-tbl th{text-align:left;font-size:11px;font-weight:500;letter-spacing:.12em;text-transform:uppercase;color:var(--qa-muted);padding:0 14px 2px;vertical-align:bottom}
.qa .qa-tbl td{background:var(--qa-soft);padding:11px 14px;vertical-align:top}
.qa .qa-tbl td:first-child{border-radius:12px 0 0 12px}.qa .qa-tbl td:last-child{border-radius:0 12px 12px 0}
.qa .qa-tbl tr{break-inside:avoid}
@media (max-width:520px){.qa .qa-tbl thead{display:none}.qa .qa-tbl,.qa .qa-tbl tbody,.qa .qa-tbl tr,.qa .qa-tbl td{display:block}.qa .qa-tbl tr{margin-bottom:6px}
  .qa .qa-tbl td:first-child{border-radius:12px 12px 0 0;padding-bottom:4px}.qa .qa-tbl td:last-child{border-radius:0 0 12px 12px;padding-top:4px}
  .qa .qa-tbl td::before{content:attr(data-l);display:block;font-size:10px;font-weight:500;letter-spacing:.12em;text-transform:uppercase;color:var(--qa-muted)}}
`;

root.QMAgreements={CSS,
  PROVIDER:{name:'Samuel Hosier',role:'Director',company:'Quiet Media Ltd'},
  COUNTER:{name:'Christopher Manoe',role:'Director',company:'International Collective Ltd',short:'I.N.C'},
  DOCS:{dpa:{kind:'dpa',title:'Data Processing Agreement',html:DPA},sla:{kind:'sla',title:'Services and Licence Agreement',html:SLA}},
  forClient:c=>/international\s+collective|^\s*i\.?\s?n\.?\s?c\.?(\s|$)/i.test((c&&c.name)||'')};
})(typeof window!=='undefined'?window:globalThis);
