/**
 * video.js — 全平台视频链接解析与懒加载播放器
 * 支持：B站 / YouTube / 腾讯视频 / 优酷 / 通用外链
 */

// 解析视频链接，返回平台信息与可嵌入地址
export function parseVideo(url) {
  if (!url) return { platform: '未知', canEmbed: false, embedUrl: '', icon: '🔗', homepage: '' };
  url = url.trim();

  // YouTube
  let m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  if (m) return { platform: 'YouTube', canEmbed: true, embedUrl: `https://www.youtube.com/embed/${m[1]}`, icon: '▶️', homepage: url };

  // Bilibili
  m = url.match(/bilibili\.com\/video\/(BV[0-9A-Za-z]+)/);
  if (m) return { platform: '哔哩哔哩', canEmbed: true, embedUrl: `https://player.bilibili.com/player.html?bvid=${m[1]}&high_quality=1&autoplay=0&danmaku=0`, icon: '📺', homepage: url };
  if (/b23\.tv/.test(url)) return { platform: '哔哩哔哩', canEmbed: false, embedUrl: '', icon: '📺', homepage: url };

  // 腾讯视频
  m = url.match(/(?:v\.qq\.com\/(?:x\/cover\/[^/]+\/|x\/page\/)|vid=)([A-Za-z0-9]+)/);
  if (m) return { platform: '腾讯视频', canEmbed: true, embedUrl: `https://v.qq.com/txp/iframe/player.html?vid=${m[1]}`, icon: '🎬', homepage: url };
  if (/v\.qq\.com/.test(url)) return { platform: '腾讯视频', canEmbed: false, embedUrl: '', icon: '🎬', homepage: url };

  // 优酷
  m = url.match(/v\.youku\.com\/v_show\/id_([^.]+)\.html/);
  if (m) return { platform: '优酷', canEmbed: true, embedUrl: `https://player.youku.com/embed/${m[1]}`, icon: '🎞️', homepage: url };

  // 爱奇艺 / 芒果 / 搜狐 等：多数不支持 iframe，直接外链
  if (/iqiyi\.com/.test(url)) return { platform: '爱奇艺', canEmbed: false, embedUrl: '', icon: '📡', homepage: url };
  if (/mgtv\.com/.test(url)) return { platform: '芒果TV', canEmbed: false, embedUrl: '', icon: '📡', homepage: url };

  return { platform: '视频链接', canEmbed: false, embedUrl: '', icon: '🔗', homepage: url };
}

// 生成视频卡片 HTML（点击懒加载播放）
export function renderVideoPlayer(url, title) {
  if (!url) return '';
  const info = parseVideo(url);
  return `
    <div class="video-card" data-video-url="${encodeURIComponent(url)}" data-platform="${info.platform}" data-embed="${info.canEmbed ? '1' : '0'}" data-embedurl="${encodeURIComponent(info.embedUrl)}" data-home="${encodeURIComponent(info.homepage)}">
      <div class="video-thumb">
        <span class="video-platform-badge">${info.icon} ${info.platform}</span>
        <button class="video-play-btn" aria-label="播放">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
        </button>
        <div class="video-title">${title ? escapeHtmlLocal(title) : (info.platform + ' 视频')}</div>
        <div class="video-hint">${info.canEmbed ? '点击加载播放' : '点击在源站打开'}</div>
      </div>
    </div>
  `;
}

function escapeHtmlLocal(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// 在 container 内绑定视频卡片点击事件（懒加载）
export function bindVideoPlayers(container) {
  container.querySelectorAll('.video-card').forEach(card => {
    card.addEventListener('click', () => {
      const embed = card.dataset.embed === '1' ? decodeURIComponent(card.dataset.embedurl) : '';
      const home = decodeURIComponent(card.dataset.home);
      if (embed) {
        card.innerHTML = `<div class="video-frame-wrap"><iframe class="video-frame" src="${embed}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen referrerpolicy="no-referrer"></iframe></div><a class="video-source-link" href="${home}" target="_blank" rel="noopener">↗ 在源站打开</a>`;
      } else {
        window.open(home, '_blank', 'noopener');
      }
    });
  });
}
