const teaserHtml = `
<!--
  Template: teaser ("Tin nóng 5s")
-->
{{{fontFace}}}
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 1080px; height: 1920px; background: transparent; }
  body {
    font-family: 'BrandFont', 'Poppins', system-ui, sans-serif;
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
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 1080px; height: 1920px; background: #111; }
  body { font-family: 'BrandFont', 'Poppins', sans-serif; }
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
    name: 'Ghép 2 Ảnh (Nửa trái / Nửa phải)',
    format: 'image',
    content_type: 'split_2',
    voice_id: null,
    video_y: 0,
    video_radius: 0,
    html_content: `
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: 1080px; height: 1080px; display: flex; background: #fff; font-family: sans-serif; }
  .left { width: 50%; height: 100%; padding: 10px; }
  .right { width: 50%; height: 100%; padding: 10px; display: flex; flex-direction: column; justify-content: center; align-items: center; background: #f8f9fa; }
  .img-wrap { width: 100%; height: 100%; border-radius: 20px; overflow: hidden; }
  img { width: 100%; height: 100%; object-fit: cover; }
  h1 { font-size: 50px; text-align: center; color: #1a1a1a; padding: 20px; font-weight: 800; line-height: 1.3; }
</style>
<div class="left">
  <div class="img-wrap"><img src="{{image_1}}" /></div>
</div>
<div class="right">
  <h1>{{title}}</h1>
</div>`,
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
  body { width: 1080px; height: 1080px; display: flex; flex-direction: column; background: #fff; }
  .top { width: 100%; height: 50%; padding: 10px; }
  .bottom { width: 100%; height: 50%; display: flex; padding: 0 5px 10px; }
  .bot-half { width: 50%; height: 100%; padding: 0 5px; }
  .img-wrap { width: 100%; height: 100%; border-radius: 20px; overflow: hidden; }
  img { width: 100%; height: 100%; object-fit: cover; }
</style>
<div class="top">
  <div class="img-wrap"><img src="{{image_1}}" /></div>
</div>
<div class="bottom">
  <div class="bot-half"><div class="img-wrap"><img src="{{image_2}}" /></div></div>
  <div class="bot-half"><div class="img-wrap"><img src="{{image_3}}" /></div></div>
</div>`,
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
  body { width: 1080px; height: 1080px; display: flex; flex-wrap: wrap; background: #fff; padding: 5px; }
  .cell { width: 50%; height: 50%; padding: 5px; }
  .img-wrap { width: 100%; height: 100%; border-radius: 20px; overflow: hidden; }
  img { width: 100%; height: 100%; object-fit: cover; }
</style>
<div class="cell"><div class="img-wrap"><img src="{{image_1}}" /></div></div>
<div class="cell"><div class="img-wrap"><img src="{{image_2}}" /></div></div>
<div class="cell"><div class="img-wrap"><img src="{{image_3}}" /></div></div>
<div class="cell"><div class="img-wrap"><img src="{{image_4}}" /></div></div>`,
    layout: {},
    is_default: true
  });

  return templates;
};
