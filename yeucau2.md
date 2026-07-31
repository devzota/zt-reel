<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&family=Oswald:wght@500;700&display=swap');

  {{{fontFace}}}

  .stage {
    position: relative;
    width: 1080px;
    height: 1920px;
    background: transparent;
    overflow: hidden;
    background: rgba(0, 0, 0, 0.5);
    font-family: 'Inter', sans-serif;
  }

  /* ?nh n?n Upload */
  .uploaded-bg {
    position: absolute;
    top: 0;
    left: 0;
    width: 1080px;
    height: 1920px;
    z-index: 0;
    pointer-events: none;
    object-fit: cover;
    -webkit-mask-image: linear-gradient(white, white), linear-gradient(white, white);
    -webkit-mask-position: 0 0, {{video_area.x}}px {{video_area.y}}px;
    -webkit-mask-size: 100% 100%, {{video_area.w}}px {{video_area.h}}px;
    -webkit-mask-repeat: no-repeat;
    -webkit-mask-composite: destination-out;
    mask-composite: exclude;
  }

  /* Video Layer */
  .video-frame {
    position: absolute;
    left: {{video_area.x}}px;
    top: {{video_area.y}}px;
    width: {{video_area.w}}px;
    height: {{video_area.h}}px;
    border-radius: {{video_area.radius}}px;
    z-index: 1;
    overflow: hidden;
  }

  /* Header (Avatar & T�n Fanpage) */
  .header {
    position: absolute;
    left: {{layout.header.x}}px;
    top: {{layout.header.y}}px;
    display: flex;
    align-items: center;
    gap: 16px;
    z-index: 10;
  }
  .header .avatar {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    overflow: hidden;
    background: rgba(0, 0, 0, 0.5);
    background: #ffffff;
    border: 3px solid #ffffff;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  }
  .header .avatar svg, .header .avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .header .name {
    color: #ffffff;
    font-size: 34px;
    font-weight: 700;
    text-shadow: 0 4px 8px rgba(0,0,0,0.6);
  }

  /* Ti�u d? (Hook) */
  .hook {
    position: absolute;
    left: {{layout.hook.x}}px;
    top: {{layout.hook.y}}px;
    color: #ffffff;
    font-size: 56px;
    font-weight: 800;
    line-height: 1.3;
    text-shadow: 2px 4px 12px rgba(0,0,0,0.8);
    max-width: 900px;
    z-index: 10;
  }
  .hook .accent {
    color: #ef4444; /* M�u n?i b?t */
  }

  /* Ph? d? (Subtitles) - D�ng cho Preview */
  .subtitles-preview {
    display: none; /* ?n khi render th?t */
    position: absolute;
    left: {{layout.subtitles.x}}px;
    top: {{layout.subtitles.y}}px;
    width: 1000px;
    text-align: center;
    z-index: 50;
  }
  .subtitles-preview span {
    background: rgba(0,0,0,0.75);
    color: #ffffff;
    font-size: 42px;
    font-weight: 700;
    padding: 12px 24px;
    border-radius: 12px;
    line-height: 1.5;
  }
</style>

<div class="stage">
  <!-- Video -->
  <div class="video-frame"></div>
  
  <!-- Uploaded Background Image (Dynamic) -->
  <img class="uploaded-bg" src="{{layout.bg_image_url}}" style="{{#unless layout.bg_image_url}}display:none;{{/unless}}" />

  <!-- Avatar & Fanpage -->
  <div class="header">
    <div class="avatar">
      {{{logoSvg}}}
    </div>
    <div class="name">{{fanpageName}}</div>
  </div>

  <!-- Hook (Ti�u d?) -->
  <div class="hook">
    {{#each hook}}<span class="line{{#if @first}} accent{{/if}}">{{this}}</span><br/>{{/each}}
  </div>

  <!-- Subtitle Preview (Ch? hi?n trong editor) -->
  <div class="subtitles-preview">
    <span>(AI Subtitles Placeholder)</span>
  </div>
</div>
