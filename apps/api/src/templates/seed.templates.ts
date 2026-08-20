const teaserHtml = `
<!--
  Template: teaser ("Tin nóng 5s")
-->
{{{fontFace}}}
<style>
  @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;600;700;800&family=Inter:wght@400;600;700;800;900&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 1080px; height: 1920px; background: transparent; }
  body {
    font-family: 'Montserrat', 'Plus Jakarta Sans', 'Inter', 'DejaVu Sans', 'Liberation Sans', sans-serif;
    -webkit-font-smoothing: antialiased;
  }

  :root { --acc: {{#if colors.danger}}{{colors.danger}}{{else}}{{colors.primary}}{{/if}}; }

  .stage { position: relative; width: 1080px; height: 1920px; overflow: hidden; }
  .bg-img { position: absolute; left: 0; top: 0; width: 1080px; height: 1920px; object-fit: cover; z-index: -1; }

  .subtitles-preview { display: none;
    position: absolute; left: {{layout.subtitles.x}}px; top: {{layout.subtitles.y}}px; width: 1000px;
    background: rgba(0,0,0,0.6); color: white; padding: 20px; font-size: 40px; font-weight: bold; border-radius: 12px;
    text-align: center; border: 2px dashed #fff;
  }

  .video-frame {
    position: absolute;
    left: {{video_area.x}}px; top: {{video_area.y}}px;
    width: {{video_area.w}}px; height: {{video_area.h}}px;
    border-radius: {{video_area.radius}}px;
    pointer-events: none;
  }

  .breaking {
    position: absolute; left: {{layout.breaking.x}}px; top: {{layout.breaking.y}}px; width: 1000px; height: 130px;
    background: linear-gradient(120deg, color-mix(in srgb, var(--acc) 82%, #7a0000) 0%, var(--acc) 55%);
    border-radius: 14px;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 12px 32px rgba(0,0,0,.35);
    overflow: hidden;
  }
  .breaking .bk-text {
    color: #fff; font-weight: 800; font-size: 60px; letter-spacing: 6px; text-transform: uppercase;
  }
  .breaking .bk-s {
    position: absolute; top: 18px; bottom: 18px; width: 24px;
    background: rgba(255,255,255,.9); transform: skewX(-20deg); border-radius: 5px;
  }
  .breaking .bk-s1 { right: 62px; }
  .breaking .bk-s2 { right: 106px; }

  .panel {
    position: absolute; left: 0; right: 0; top: 1264px; bottom: 0;
    background:
      repeating-radial-gradient(circle at 50% 118%, rgba(255,255,255,.05) 0 3px, transparent 3px 120px),
      linear-gradient(180deg, color-mix(in srgb, var(--acc) 90%, transparent) 0%, var(--acc) 10%);
  }

  .card {
    position: absolute; left: 68px; right: 68px; top: 1264px; height: 450px;
    background: #ffffff; border-radius: 6px;
    box-shadow: 0 18px 44px rgba(0,0,0,.35);
  }
  .card::after {
    content: ''; position: absolute; left: 0; right: 0; top: 92px;
    border-top: 2px solid #ececec;
  }
  .card::before {
    content: ''; position: absolute; left: 14px; right: 14px; top: 106px; bottom: 14px;
    background: #ededed;
  }

  .header {
    position: absolute; left: {{layout.header.x}}px; top: {{layout.header.y}}px;
    display: flex; align-items: center; gap: 18px;
  }
  .header .logo { width: 58px; height: 58px; border-radius: 50%; overflow: hidden; flex: 0 0 auto; }
  .header .logo img, .header .logo svg { width: 100%; height: 100%; object-fit: cover; display: block; }
  .header .pname {
    font-size: 36px; font-weight: 800; letter-spacing: -0.3px; color: #1d2823;
  }
  .header .pname .dot { color: var(--acc); }

  .hook { position: absolute; left: {{layout.hook.x}}px; top: {{layout.hook.y}}px; width: 848px; }
  .hook .line {
    display: inline; font-size: 56px; font-weight: 800; line-height: 1.28; letter-spacing: -0.4px;
    color: #101613;
  }
  .hook .line.accent { color: var(--acc); }
</style>

<div class="stage">
  <img class="bg-img" src="{{layout.bg_image_url}}" style="{{#unless layout.bg_image_url}}display:none;{{/unless}}" />
  <div class="video-frame"></div>
  <div class="breaking"><span class="bk-text">Breaking News</span><span class="bk-s bk-s1"></span><span class="bk-s bk-s2"></span></div>
  <div class="panel"></div>
  <div class="card"></div>

  <div class="header" data-drag-id="header">
    <span class="logo">{{{logoSvg}}}</span>
    <span class="pname">{{fanpageName}}<span class="dot">.</span></span>
  </div>

  <div class="hook" data-drag-id="hook">
    {{#each hook}}<span class="line{{#if @first}} accent{{/if}}">{{this}}{{#unless @last}}&#32;{{/unless}}</span>{{/each}}
  </div>
  
  <div class="subtitles-preview" data-drag-id="subtitles">
    Khu vực phụ đề (Subtitles)
  </div>
</div>
`;

const basicHtml = `
{{{fontFace}}}
<style>
  @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;600;700;800&family=Inter:wght@400;600;700;800;900&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 1080px; height: 1920px; background: #111; }
  body { font-family: 'Montserrat', 'Plus Jakarta Sans', 'Inter', 'DejaVu Sans', 'Liberation Sans', sans-serif; }
  :root { --acc: {{#if colors.primary}}{{colors.primary}}{{else}}#1877f2{{/if}}; }
  .stage { position: relative; width: 1080px; height: 1920px; overflow: hidden; }
  .bg-img { position: absolute; left: 0; top: 0; width: 1080px; height: 1920px; object-fit: cover; z-index: -1; }
  .video-frame {
    position: absolute; left: {{video_area.x}}px; top: {{video_area.y}}px;
    width: {{video_area.w}}px; height: {{video_area.h}}px;
    border-radius: {{video_area.radius}}px; pointer-events: none;
    border: 4px solid var(--acc);
  }
  .header {
    position: absolute; left: {{layout.header.x}}px; top: {{layout.header.y}}px;
    display: flex; align-items: center; gap: 20px; background: rgba(0,0,0,0.5); padding: 10px 30px; border-radius: 50px;
  }
  .header .pname { color: white; font-size: 40px; font-weight: bold; }
  .hook {
    position: absolute; left: {{layout.hook.x}}px; top: {{layout.hook.y}}px; width: 900px;
    color: white; font-size: 60px; font-weight: 900; text-align: center; text-shadow: 0 4px 10px rgba(0,0,0,0.5);
  }
  .verdict {
    position: absolute; left: {{layout.verdict.x}}px; top: {{layout.verdict.y}}px; width: 900px;
    background: var(--acc); color: white; font-size: 40px; font-weight: bold; padding: 30px; border-radius: 20px; text-align: center;
  }
</style>
<div class="stage">
  <img class="bg-img" src="{{layout.bg_image_url}}" style="{{#unless layout.bg_image_url}}display:none;{{/unless}}" />
  <div class="video-frame"></div>
  <div class="header" data-drag-id="header">
    <span class="pname">{{fanpageName}}</span>
  </div>
  <div class="hook" data-drag-id="hook">
    {{#each hook}}<span>{{this}} </span>{{/each}}
  </div>
  <div class="verdict" data-drag-id="verdict">
    MẪU NỘI DUNG DEMO
  </div>
</div>
`;

export const seedTemplates = () => {
  const templates: any[] = [];
  
  templates.push({
    name: 'Breaking News Modern',
    format: 'video',
    content_type: 'teaser',
    voice_id: null,
    video_y: 184,
    video_radius: 0,
    html_content: teaserHtml,
    layout: {
      breaking: { x: 40, y: 26 },
      header: { x: 84, y: 1362 },
      hook: { x: 90, y: 1450 },
      subtitles: { x: 40, y: 1550 }
    },
    is_default: true
  });

  templates.push({
    name: 'Basic Video Mặc định',
    format: 'video',
    content_type: 'basic_html',
    voice_id: null,
    video_y: 194,
    video_radius: 0,
    html_content: basicHtml,
    layout: {
      header: { x: 84, y: 1362 },
      hook: { x: 90, y: 1450 },
      verdict: { x: 90, y: 1550 }
    },
    is_default: true
  });

  templates.push({
    name: 'Ghép 2 Ảnh (Nửa trái / Nửa phải)',
    format: 'image',
    content_type: 'split_2',
    voice_id: null,
    video_y: 0,
    video_radius: 0,
    html_content: `
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: 1080px; height: 1080px; display: flex; background: #fff; position: relative; }
  .left { width: 50%; height: 100%; padding-right: 5px; position: relative; }
  .right { width: 50%; height: 100%; padding-left: 5px; position: relative; }
  .img-wrap { width: 100%; height: 100%; overflow: hidden; position: relative; }
  img { width: 100%; height: 100%; object-fit: cover; }
  
  /* ẢNH NHỎ HÌNH TRÒN GIỮA TÂM */
  .inset { position: absolute; top: 50%; left: 50%; width: 400px; height: 400px; border: 12px solid white; box-shadow: 0 15px 40px rgba(0,0,0,0.6); border-radius: 50%; overflow: hidden; z-index: 5; transform: translate(-50%, -50%); }
  
  /* MŨI TÊN CONG ĐẸP MẮT */
  .arrow { position: absolute; top: 32%; left: 20%; width: 200px; height: 200px; z-index: 10; filter: drop-shadow(0px 8px 15px rgba(0,0,0,0.7)) drop-shadow(0px 0px 4px white); transform: rotate(15deg); }
</style>
<div class="left"><div class="img-wrap"><img src="{{image_1}}" /></div></div>
<div class="right"><div class="img-wrap"><img src="{{image_2}}" /></div></div>
<!-- TRUNG TÂM -->
<div class="inset"><img src="{{image_3}}" /></div>
<svg class="arrow" viewBox="0 0 512 512" fill="#ff0033">
  <path d="M500.3 227.3L372.3 99.3c-15.6-15.6-40.9-15.6-56.6 0-15.6 15.6-15.6 40.9 0 56.6l60.1 60.1H192c-88.4 0-160 71.6-160 160v32c0 22.1 17.9 40 40 40s40-17.9 40-40v-32c0-44.2 35.8-80 80-80h183.8l-60.1 60.1c-15.6 15.6-15.6 40.9 0 56.6 15.6 15.6 40.9 15.6 56.6 0l128-128c15.6-15.6 15.6-40.9 0-56.6z"/>
</svg>`,
    layout: {},
    is_default: true
  });

  templates.push({
    name: 'Ghép 3 Ảnh (1 Trên, 2 Dưới)',
    format: 'image',
    content_type: 'split_3',
    voice_id: null,
    video_y: 0,
    video_radius: 0,
    html_content: `
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: 1080px; height: 1080px; display: flex; flex-direction: column; background: #fff; position: relative; }
  .top { width: 100%; height: 50%; padding-bottom: 5px; position: relative; }
  .bottom { width: 100%; height: 50%; display: flex; padding-top: 5px; }
  .bot-half { width: 50%; height: 100%; }
  .bot-half:first-child { padding-right: 5px; }
  .bot-half:last-child { padding-left: 5px; }
  .img-wrap { width: 100%; height: 100%; overflow: hidden; position: relative; }
  img { width: 100%; height: 100%; object-fit: cover; }
  
  /* ẢNH NHỎ HÌNH TRÒN */
  .inset { position: absolute; top: 50%; left: 50%; width: 400px; height: 400px; border: 12px solid white; box-shadow: 0 15px 40px rgba(0,0,0,0.6); border-radius: 50%; overflow: hidden; z-index: 5; transform: translate(-50%, -50%); }
  
  /* MŨI TÊN CONG ĐẸP MẮT */
  .arrow { position: absolute; top: 32%; left: 20%; width: 200px; height: 200px; z-index: 10; filter: drop-shadow(0px 8px 15px rgba(0,0,0,0.7)) drop-shadow(0px 0px 4px white); transform: rotate(15deg); }
</style>
<div class="top">
  <div class="img-wrap"><img src="{{image_1}}" /></div>
</div>
<div class="bottom">
  <div class="bot-half"><div class="img-wrap"><img src="{{image_2}}" /></div></div>
  <div class="bot-half"><div class="img-wrap"><img src="{{image_3}}" /></div></div>
</div>
<!-- TRUNG TÂM -->
<div class="inset"><img src="{{image_4}}" /></div>
<svg class="arrow" viewBox="0 0 512 512" fill="#ff0033">
  <path d="M500.3 227.3L372.3 99.3c-15.6-15.6-40.9-15.6-56.6 0-15.6 15.6-15.6 40.9 0 56.6l60.1 60.1H192c-88.4 0-160 71.6-160 160v32c0 22.1 17.9 40 40 40s40-17.9 40-40v-32c0-44.2 35.8-80 80-80h183.8l-60.1 60.1c-15.6 15.6-15.6 40.9 0 56.6 15.6 15.6 40.9 15.6 56.6 0l128-128c15.6-15.6 15.6-40.9 0-56.6z"/>
</svg>`,
    layout: {},
    is_default: true
  });

  templates.push({
    name: 'Ghép 4 Ảnh (Lưới 2x2)',
    format: 'image',
    content_type: 'split_4',
    voice_id: null,
    video_y: 0,
    video_radius: 0,
    html_content: `
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: 1080px; height: 1080px; display: flex; flex-wrap: wrap; background: #fff; position: relative; }
  .cell { width: 50%; height: 50%; position: relative; }
  .cell:nth-child(1) { padding: 0 5px 5px 0; }
  .cell:nth-child(2) { padding: 0 0 5px 5px; }
  .cell:nth-child(3) { padding: 5px 5px 0 0; }
  .cell:nth-child(4) { padding: 5px 0 0 5px; }
  .img-wrap { width: 100%; height: 100%; overflow: hidden; position: relative; }
  img { width: 100%; height: 100%; object-fit: cover; }
  
  /* ẢNH NHỎ HÌNH TRÒN */
  .inset { position: absolute; top: 50%; left: 50%; width: 400px; height: 400px; border: 12px solid white; box-shadow: 0 15px 40px rgba(0,0,0,0.6); border-radius: 50%; overflow: hidden; z-index: 5; transform: translate(-50%, -50%); }
  
  /* MŨI TÊN CONG ĐẸP MẮT */
  .arrow { position: absolute; top: 30%; left: 25%; width: 220px; height: 220px; z-index: 10; filter: drop-shadow(0px 8px 15px rgba(0,0,0,0.7)) drop-shadow(0px 0px 4px white); transform: rotate(15deg); }
</style>
<div class="cell"><div class="img-wrap"><img src="{{image_1}}" /></div></div>
<div class="cell"><div class="img-wrap"><img src="{{image_2}}" /></div></div>
<div class="cell"><div class="img-wrap"><img src="{{image_3}}" /></div></div>
<div class="cell"><div class="img-wrap"><img src="{{image_4}}" /></div></div>
<!-- TRUNG TÂM -->
<div class="inset"><img src="{{image_5}}" /></div>
<svg class="arrow" viewBox="0 0 512 512" fill="#ff0033">
  <path d="M500.3 227.3L372.3 99.3c-15.6-15.6-40.9-15.6-56.6 0-15.6 15.6-15.6 40.9 0 56.6l60.1 60.1H192c-88.4 0-160 71.6-160 160v32c0 22.1 17.9 40 40 40s40-17.9 40-40v-32c0-44.2 35.8-80 80-80h183.8l-60.1 60.1c-15.6 15.6-15.6 40.9 0 56.6 15.6 15.6 40.9 15.6 56.6 0l128-128c15.6-15.6 15.6-40.9 0-56.6z"/>
</svg>`,
    layout: {},
    is_default: true
  });



  return templates;
};
