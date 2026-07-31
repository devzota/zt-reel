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
  
  const addTemplates = (format: string) => {
    /** Tin nóng 5s (Teaser) */
    templates.push({
      name: 'Tin nóng 5s',
      format,
      content_type: 'teaser',
      voice_id: null,
      video_y: 184,
      video_radius: 0,
      html_content: teaserHtml,
      layout: {
        breaking: { x: 40, y: 26 },
        header: { x: 84, y: 1362 }, /** Based on CSS */
        hook: { x: 90, y: 1450 },
      },
      is_default: true
    });
  };

  addTemplates('video');
  addTemplates('image');

  return templates;
};
