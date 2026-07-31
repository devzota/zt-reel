--
-- PostgreSQL database dump
--

\restrict dW62B379F6Vl93zAiZugrgkhdVC4KqADTtW8QRwOBpJo1O8gFQb6u0Ceb9oXE5D

-- Dumped from database version 15.18 (Debian 15.18-1.pgdg13+1)
-- Dumped by pg_dump version 15.18 (Debian 15.18-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: ztteam_templates; Type: TABLE DATA; Schema: public; Owner: root
--

INSERT INTO public.ztteam_templates (id, name, format, content_type, voice_id, video_y, video_radius, html_content, layout, is_default, created_at, updated_at, fb_page_id) VALUES ('cms7gju870000a0w784w6piia', 'Breaking News Modern', 'video', 'teaser', 'nova', 0, 0, '<style>
  @import url(''https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&family=Oswald:wght@500;700&display=swap'');

  {{{fontFace}}}

  .stage {
    position: relative;
    width: 1080px;
    height: 1920px;
    background: transparent;
    overflow: hidden;
    background: rgba(0, 0, 0, 0.5);
    font-family: ''Inter'', sans-serif;
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
    -webkit-mask-size: 100% 100%, {{video_area.w}}px {{video_area.h}}px;
    -webkit-mask-position: 0 0, {{video_area.x}}px {{video_area.y}}px;
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

  /* Header (Avatar & T├ó╦å┬⌐├óΓÇ¥┬É├óΓÇó┼ôn Fanpage) */
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

  /* Ti├ó╦å┬⌐├óΓÇ¥┬É├óΓÇó┼ôu d? (Hook) */
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
    color: #ef4444; /* M├ó╦å┬⌐├óΓÇ¥┬É├óΓÇó┼ôu n?i b?t */
  }

  /* Ph? d? (Subtitles) - D├ó╦å┬⌐├óΓÇ¥┬É├óΓÇó┼ông cho Preview */
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

  <!-- Hook (Ti├ó╦å┬⌐├óΓÇ¥┬É├óΓÇó┼ôu d?) -->
  <div class="hook">
    {{#each hook}}<span class="line{{#if @first}} accent{{/if}}">{{this}}</span><br/>{{/each}}
  </div>

  <!-- Subtitle Preview (Ch? hi?n trong editor) -->
  <div class="subtitles-preview">
    <span>(AI Subtitles Placeholder)</span>
  </div>
</div>
', '{"hook": {"x": 156, "y": 1398}, "header": {"x": 40, "y": 40}, "breaking": {"x": 40, "y": 1310}, "subtitles": {"x": 0, "y": 1238}, "bg_image_url": "/storage/templates/cms7gju870000a0w784w6piia-1785425235232-816425108.png"}', false, '2026-07-30 11:56:18.247', '2026-07-30 14:04:55.922', NULL);
INSERT INTO public.ztteam_templates (id, name, format, content_type, voice_id, video_y, video_radius, html_content, layout, is_default, created_at, updated_at, fb_page_id) VALUES ('cms46pa0w0000eww7b8x92y2f', 'Tin n├óΓÇ¥┼ô├óΓÇ¥ΓÇÜng 5s', 'video', 'teaser', NULL, 200, 0, '<style>
  @import url(''https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&family=Oswald:wght@500;700&display=swap'');

  {{{fontFace}}}

  .stage {
    position: relative;
    width: 1080px;
    height: 1920px;
    background: transparent;
    overflow: hidden;
    background: rgba(0, 0, 0, 0.5);
    font-family: ''Inter'', sans-serif;
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
    -webkit-mask-size: 100% 100%, {{video_area.w}}px {{video_area.h}}px;
    -webkit-mask-position: 0 0, {{video_area.x}}px {{video_area.y}}px;
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

  /* Header (Avatar & T├ó╦å┬⌐├óΓÇ¥┬É├óΓÇó┼ôn Fanpage) */
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

  /* Ti├ó╦å┬⌐├óΓÇ¥┬É├óΓÇó┼ôu d? (Hook) */
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
    color: #ef4444; /* M├ó╦å┬⌐├óΓÇ¥┬É├óΓÇó┼ôu n?i b?t */
  }

  /* Ph? d? (Subtitles) - D├ó╦å┬⌐├óΓÇ¥┬É├óΓÇó┼ông cho Preview */
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

  <!-- Hook (Ti├ó╦å┬⌐├óΓÇ¥┬É├óΓÇó┼ôu d?) -->
  <div class="hook">
    {{#each hook}}<span class="line{{#if @first}} accent{{/if}}">{{this}}</span><br/>{{/each}}
  </div>

  <!-- Subtitle Preview (Ch? hi?n trong editor) -->
  <div class="subtitles-preview">
    <span>(AI Subtitles Placeholder)</span>
  </div>
</div>
', '{"hook": {"x": 22, "y": 1530}, "video": {"h": 1080, "w": 1080, "x": 0}, "header": {"x": 668, "y": 70}, "breaking": {"x": 40, "y": 26}, "subtitles": {"x": 36, "y": 1146}, "bg_image_url": "/storage/templates/cms46pa0w0000eww7b8x92y2f-1785423696395-607825218.png"}', true, '2026-07-28 04:57:17.312', '2026-07-28 04:57:17.312', NULL);
INSERT INTO public.ztteam_templates (id, name, format, content_type, voice_id, video_y, video_radius, html_content, layout, is_default, created_at, updated_at, fb_page_id) VALUES ('cms46pa110001eww7kuivfkvl', 'Tin n├óΓÇ¥┼ô├óΓÇ¥ΓÇÜng 5s', 'image', 'teaser', NULL, 184, 0, '<style>
  @import url(''https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&family=Oswald:wght@500;700&display=swap'');

  {{{fontFace}}}

  .stage {
    position: relative;
    width: 1080px;
    height: 1920px;
    background: transparent;
    overflow: hidden;
    background: rgba(0, 0, 0, 0.5);
    font-family: ''Inter'', sans-serif;
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
    -webkit-mask-size: 100% 100%, {{video_area.w}}px {{video_area.h}}px;
    -webkit-mask-position: 0 0, {{video_area.x}}px {{video_area.y}}px;
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

  /* Header (Avatar & T├ó╦å┬⌐├óΓÇ¥┬É├óΓÇó┼ôn Fanpage) */
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

  /* Ti├ó╦å┬⌐├óΓÇ¥┬É├óΓÇó┼ôu d? (Hook) */
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
    color: #ef4444; /* M├ó╦å┬⌐├óΓÇ¥┬É├óΓÇó┼ôu n?i b?t */
  }

  /* Ph? d? (Subtitles) - D├ó╦å┬⌐├óΓÇ¥┬É├óΓÇó┼ông cho Preview */
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

  <!-- Hook (Ti├ó╦å┬⌐├óΓÇ¥┬É├óΓÇó┼ôu d?) -->
  <div class="hook">
    {{#each hook}}<span class="line{{#if @first}} accent{{/if}}">{{this}}</span><br/>{{/each}}
  </div>

  <!-- Subtitle Preview (Ch? hi?n trong editor) -->
  <div class="subtitles-preview">
    <span>(AI Subtitles Placeholder)</span>
  </div>
</div>
', '{"hook": {"x": 90, "y": 1450}, "header": {"x": 84, "y": 1362}, "breaking": {"x": 40, "y": 26}}', true, '2026-07-28 04:57:17.317', '2026-07-28 04:57:17.317', NULL);
INSERT INTO public.ztteam_templates (id, name, format, content_type, voice_id, video_y, video_radius, html_content, layout, is_default, created_at, updated_at, fb_page_id) VALUES ('cms7ss2xu0003fww7vzaoonef', 'Breaking News Modern (B├â┼╕├óΓÇóΓÇÿ├â┬║n sao)', 'video', 'teaser', 'nova', -24, 0, '<style>
  @import url(''https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&family=Oswald:wght@500;700&display=swap'');

  {{{fontFace}}}

  .stage {
    position: relative;
    width: 1080px;
    height: 1920px;
    background: transparent;
    overflow: hidden;
    background: rgba(0, 0, 0, 0.5);
    font-family: ''Inter'', sans-serif;
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
    -webkit-mask-size: 100% 100%, {{video_area.w}}px {{video_area.h}}px;
    -webkit-mask-position: 0 0, {{video_area.x}}px {{video_area.y}}px;
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

  /* Header (Avatar & T├ó╦å┬⌐├óΓÇ¥┬É├óΓÇó┼ôn Fanpage) */
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

  /* Ti├ó╦å┬⌐├óΓÇ¥┬É├óΓÇó┼ôu d? (Hook) */
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
    color: #ef4444; /* M├ó╦å┬⌐├óΓÇ¥┬É├óΓÇó┼ôu n?i b?t */
  }

  /* Ph? d? (Subtitles) - D├ó╦å┬⌐├óΓÇ¥┬É├óΓÇó┼ông cho Preview */
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

  <!-- Hook (Ti├ó╦å┬⌐├óΓÇ¥┬É├óΓÇó┼ôu d?) -->
  <div class="hook">
    {{#each hook}}<span class="line{{#if @first}} accent{{/if}}">{{this}}</span><br/>{{/each}}
  </div>

  <!-- Subtitle Preview (Ch? hi?n trong editor) -->
  <div class="subtitles-preview">
    <span>(AI Subtitles Placeholder)</span>
  </div>
</div>
', '{"hook": {"x": 160, "y": 1390}, "video": {"h": 1080, "w": 1080, "x": 0}, "header": {"x": 40, "y": 40}, "breaking": {"x": 40, "y": 1310}, "subtitles": {"x": 12, "y": 1122}, "bg_image_url": "/storage/templates/cms7ss2xu0003fww7vzaoonef-1785433729457-58147197.png"}', false, '2026-07-30 17:38:38.178', '2026-07-30 17:38:38.178', NULL);
INSERT INTO public.ztteam_templates (id, name, format, content_type, voice_id, video_y, video_radius, html_content, layout, is_default, created_at, updated_at, fb_page_id) VALUES ('cms7sp7wa0000fww7wfy4nw5m', 'Tin n├óΓÇ¥┼ô├óΓÇ¥ΓÇÜng 5s (B├â┼╕├óΓÇóΓÇÿ├â┬║n sao)', 'video', 'teaser', 'nova', 220, 0, '<style>
  @import url(''https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&family=Oswald:wght@500;700&display=swap'');

  {{{fontFace}}}

  .stage {
    position: relative;
    width: 1080px;
    height: 1920px;
    background: transparent;
    overflow: hidden;
    background: rgba(0, 0, 0, 0.5);
    font-family: ''Inter'', sans-serif;
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
    -webkit-mask-size: 100% 100%, {{video_area.w}}px {{video_area.h}}px;
    -webkit-mask-position: 0 0, {{video_area.x}}px {{video_area.y}}px;
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

  /* Header (Avatar & T├ó╦å┬⌐├óΓÇ¥┬É├óΓÇó┼ôn Fanpage) */
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

  /* Ti├ó╦å┬⌐├óΓÇ¥┬É├óΓÇó┼ôu d? (Hook) */
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
    color: #ef4444; /* M├ó╦å┬⌐├óΓÇ¥┬É├óΓÇó┼ôu n?i b?t */
  }

  /* Ph? d? (Subtitles) - D├ó╦å┬⌐├óΓÇ¥┬É├óΓÇó┼ông cho Preview */
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

  <!-- Hook (Ti├ó╦å┬⌐├óΓÇ¥┬É├óΓÇó┼ôu d?) -->
  <div class="hook">
    {{#each hook}}<span class="line{{#if @first}} accent{{/if}}">{{this}}</span><br/>{{/each}}
  </div>

  <!-- Subtitle Preview (Ch? hi?n trong editor) -->
  <div class="subtitles-preview">
    <span>(AI Subtitles Placeholder)</span>
  </div>
</div>
', '{"hook": {"x": 22, "y": 1530}, "video": {"h": 864, "w": 852, "x": 108}, "header": {"x": 668, "y": 70}, "breaking": {"x": 40, "y": 26}, "subtitles": {"x": 36, "y": 1146}, "bg_image_url": "/storage/templates/cms7sp7wa0000fww7wfy4nw5m-1785433073903-782725516.png"}', false, '2026-07-30 17:36:24.634', '2026-07-30 17:36:24.634', NULL);
INSERT INTO public.ztteam_templates (id, name, format, content_type, voice_id, video_y, video_radius, html_content, layout, is_default, created_at, updated_at, fb_page_id) VALUES ('cms7ssq6j0004fww7gpsxcstw', 'Breaking News Modern (B├â┼╕├óΓÇóΓÇÿ├â┬║n sao)', 'video', 'teaser', 'shimmer', 252, 0, '<style>
  @import url(''https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&family=Oswald:wght@500;700&display=swap'');

  {{{fontFace}}}

  .stage {
    position: relative;
    width: 1080px;
    height: 1920px;
    background: transparent;
    overflow: hidden;
    background: rgba(0, 0, 0, 0.5);
    font-family: ''Inter'', sans-serif;
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
    -webkit-mask-size: 100% 100%, {{video_area.w}}px {{video_area.h}}px;
    -webkit-mask-position: 0 0, {{video_area.x}}px {{video_area.y}}px;
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

  /* Header (Avatar & T├ó╦å┬⌐├óΓÇ¥┬É├óΓÇó┼ôn Fanpage) */
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

  /* Ti├ó╦å┬⌐├óΓÇ¥┬É├óΓÇó┼ôu d? (Hook) */
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
    color: #ef4444; /* M├ó╦å┬⌐├óΓÇ¥┬É├óΓÇó┼ôu n?i b?t */
  }

  /* Ph? d? (Subtitles) - D├ó╦å┬⌐├óΓÇ¥┬É├óΓÇó┼ông cho Preview */
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

  <!-- Hook (Ti├ó╦å┬⌐├óΓÇ¥┬É├óΓÇó┼ôu d?) -->
  <div class="hook">
    {{#each hook}}<span class="line{{#if @first}} accent{{/if}}">{{this}}</span><br/>{{/each}}
  </div>

  <!-- Subtitle Preview (Ch? hi?n trong editor) -->
  <div class="subtitles-preview">
    <span>(AI Subtitles Placeholder)</span>
  </div>
</div>
', '{"hook": {"x": 156, "y": 1398}, "video": {"h": 904, "w": 916, "x": 84}, "header": {"x": 40, "y": 40}, "breaking": {"x": 40, "y": 1310}, "subtitles": {"x": 28, "y": 1234}, "bg_image_url": "/storage/templates/cms7gju870000a0w784w6piia-1785425235232-816425108.png"}', false, '2026-07-30 17:39:08.299', '2026-07-30 17:39:08.299', NULL);
INSERT INTO public.ztteam_templates (id, name, format, content_type, voice_id, video_y, video_radius, html_content, layout, is_default, created_at, updated_at, fb_page_id) VALUES ('cms7t9xet000efww7mqahc6he', 'Tin n├óΓÇ¥┼ô├óΓÇ¥ΓÇÜng 5s (B├â┼╕├óΓÇóΓÇÿ├â┬║n sao)', 'video', 'teaser', NULL, 280, 0, '<style>
  @import url(''https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&family=Oswald:wght@500;700&display=swap'');

  {{{fontFace}}}

  .stage {
    position: relative;
    width: 1080px;
    height: 1920px;
    background: transparent;
    overflow: hidden;
    background: rgba(0, 0, 0, 0.5);
    font-family: ''Inter'', sans-serif;
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
    -webkit-mask-size: 100% 100%, {{video_area.w}}px {{video_area.h}}px;
    -webkit-mask-position: 0 0, {{video_area.x}}px {{video_area.y}}px;
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

  /* Header (Avatar & T├ó╦å┬⌐├óΓÇ¥┬É├óΓÇó┼ôn Fanpage) */
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

  /* Ti├ó╦å┬⌐├óΓÇ¥┬É├óΓÇó┼ôu d? (Hook) */
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
    color: #ef4444; /* M├ó╦å┬⌐├óΓÇ¥┬É├óΓÇó┼ôu n?i b?t */
  }

  /* Ph? d? (Subtitles) - D├ó╦å┬⌐├óΓÇ¥┬É├óΓÇó┼ông cho Preview */
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

  <!-- Hook (Ti├ó╦å┬⌐├óΓÇ¥┬É├óΓÇó┼ôu d?) -->
  <div class="hook">
    {{#each hook}}<span class="line{{#if @first}} accent{{/if}}">{{this}}</span><br/>{{/each}}
  </div>

  <!-- Subtitle Preview (Ch? hi?n trong editor) -->
  <div class="subtitles-preview">
    <span>(AI Subtitles Placeholder)</span>
  </div>
</div>
', '{"hook": {"x": 34, "y": 1534}, "video": {"h": 760, "w": 796, "x": 132}, "header": {"x": 668, "y": 70}, "breaking": {"x": 40, "y": 26}, "subtitles": {"x": 36, "y": 1146}, "bg_image_url": "/storage/templates/cms46pa0w0000eww7b8x92y2f-1785423696395-607825218.png"}', false, '2026-07-30 17:52:30.821', '2026-07-30 17:52:30.821', NULL);


--
-- PostgreSQL database dump complete
--

\unrestrict dW62B379F6Vl93zAiZugrgkhdVC4KqADTtW8QRwOBpJo1O8gFQb6u0Ceb9oXE5D

