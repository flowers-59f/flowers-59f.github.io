/*!
 * collapsible-headings.js — Obsidian 风格的标题折叠
 * ---------------------------------------------------------------------------
 * 给 Hugo / PaperMod 文章正文（.post-content）里的 h1~h6 加上「可折叠」能力：
 *
 *   1. 按标题层级自动嵌套：折叠 h2 会连同它下面所有 h3 / h4 … 以及正文一起收起，
 *      再展开 h2 时，h3 保持它自己原来的展开/折叠状态（和 Obsidian 一致）。
 *   2. 默认全部折叠。
 *   3. 点标题左边的箭头，或者点标题文字本身都能折叠/展开；
 *      标题里的链接（含 PaperMod 的 # 锚点）照常点击跳转，不会误触折叠。
 *   4. 页面顶部提供「展开全部 / 折叠全部」。
 *   5. 通过目录（TOC）、脚注、任何 #锚点 跳到被折叠的标题时，
 *      会先自动展开它的所有上级，再滚动到位。
 *   6. 标题下面什么都没有的「空章节」不显示箭头，也不会响应点击。
 *
 * 作者：为 flowers-59f.github.io 定制
 */
(function () {
  'use strict';

  /* 生效范围：PaperMod 文章正文。若想让其它页面（如自定义 layout）
     也生效，把它的容器 class 加进来即可。 */
  var CONTAINER_SELECTOR = '.post-content';

  var HEADING_RE = /^H[1-6]$/;

  var CHEVRON =
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
    '<path d="M9 6l6 6-6 6"></path>' +
    '</svg>';

  var LABEL_TOGGLE = '展开 / 折叠此章节';
  var LABEL_EXPAND_ALL = '展开全部';
  var LABEL_COLLAPSE_ALL = '折叠全部';

  /* 拖拽选字时不要误触折叠：按下和抬起位置差超过这个像素数就当作选字 */
  var DRAG_TOLERANCE = 4;

  var containers = [];

  /* ======================================================================== */
  /* 小工具                                                                    */
  /* ======================================================================== */

  function headingLevel(node) {
    if (!node || node.nodeType !== 1 || !HEADING_RE.test(node.tagName)) return 0;
    return node.tagName.charCodeAt(1) - 48; /* 'H3' -> 3 */
  }

  function closestClass(node, className, boundary) {
    while (node && node !== boundary) {
      if (node.nodeType === 1 && node.classList && node.classList.contains(className)) {
        return node;
      }
      node = node.parentNode;
    }
    return null;
  }

  function closestLink(node, boundary) {
    while (node && node !== boundary) {
      if (node.nodeType === 1 && node.tagName === 'A') return node;
      node = node.parentNode;
    }
    return null;
  }

  function isBlank(node) {
    return !node.textContent || !node.textContent.replace(/\s+/g, '');
  }

  function isCollapsed(section) {
    return section.classList.contains('is-collapsed');
  }

  function isFolded(section) {
    return section.classList.contains('ch-section');
  }

  /* ======================================================================== */
  /* 折叠状态                                                                  */
  /* ======================================================================== */

  function setCollapsed(section, collapsed) {
    if (collapsed) {
      section.classList.add('is-collapsed');
    } else {
      section.classList.remove('is-collapsed');
    }
    var toggle = section._chToggle;
    if (toggle) toggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
  }

  function editable(section) {
    return isFolded(section) && !section.classList.contains('ch-empty');
  }

  /* ======================================================================== */
  /* 生成折叠结构                                                              */
  /* ======================================================================== */

  function createSection(heading, level, index) {
    var section = document.createElement('section');
    section.className = 'ch-section';
    section.setAttribute('data-ch-level', String(level));

    var body = document.createElement('div');
    body.className = 'ch-body';
    body.id = (heading.id ? heading.id : 'ch-section-' + index) + '-body';

    var toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'ch-toggle';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-controls', body.id);
    toggle.setAttribute('aria-label', LABEL_TOGGLE);
    toggle.setAttribute('title', LABEL_TOGGLE);
    toggle.innerHTML = CHEVRON;

    heading.classList.add('ch-heading');
    heading.insertBefore(toggle, heading.firstChild);

    section.appendChild(heading);
    section.appendChild(body);

    section._chToggle = toggle;
    section._chBody = body;
    return section;
  }

  /**
   * 把容器里「平铺」的 h1~h6 重新组织成按层级嵌套的 section。
   * 用栈实现：遇到 hN 就把栈里层级 >= N 的全部弹出，剩下的栈顶就是它的父级。
   */
  function buildFolds(container) {
    var nodes = Array.prototype.slice.call(container.childNodes);
    var fragment = document.createDocumentFragment();
    var stack = []; /* [{ level: Number, body: Element }] */
    var sections = [];
    var index = 0;

    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      var level = headingLevel(node);

      if (level) {
        while (stack.length && stack[stack.length - 1].level >= level) stack.pop();

        var section = createSection(node, level, ++index);
        var host = stack.length ? stack[stack.length - 1].body : fragment;
        host.appendChild(section);

        stack.push({ level: level, body: section._chBody });
        sections.push(section);
      } else {
        var target = stack.length ? stack[stack.length - 1].body : fragment;
        target.appendChild(node);
      }
    }

    container.appendChild(fragment);
    return sections;
  }

  function markEmptySections(sections) {
    for (var i = 0; i < sections.length; i++) {
      var section = sections[i];
      var body = section._chBody;
      /* body 里连一个子元素都没有、也没有文字 -> 空章节 */
      if (!body.children.length && isBlank(body)) {
        section.classList.add('ch-empty');
        if (section._chToggle) section._chToggle.disabled = true;
      }
    }
  }

  /* ======================================================================== */
  /* 工具条                                                                    */
  /* ======================================================================== */

  function buildToolbar(container) {
    var bar = document.createElement('div');
    bar.className = 'ch-toolbar';
    bar.setAttribute('role', 'group');
    bar.setAttribute('aria-label', '章节折叠控制');

    var buttons = [
      { action: 'expand', label: LABEL_EXPAND_ALL },
      { action: 'collapse', label: LABEL_COLLAPSE_ALL }
    ];

    for (var i = 0; i < buttons.length; i++) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'ch-toolbar-btn';
      button.setAttribute('data-ch-action', buttons[i].action);
      button.textContent = buttons[i].label;
      bar.appendChild(button);
    }

    container.insertBefore(bar, container.firstChild);
  }

  /* ======================================================================== */
  /* 交互                                                                      */
  /* ======================================================================== */

  function bindContainer(container, sections) {
    var downX = 0;
    var downY = 0;
    var downValid = false;

    container.addEventListener(
      'mousedown',
      function (event) {
        downValid = event.button === 0;
        downX = event.clientX;
        downY = event.clientY;
      },
      true
    );

    container.addEventListener('click', function (event) {
      if (event.defaultPrevented) return;
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      var target = event.target;
      if (!target || target.nodeType !== 1) return;

      /* 拖拽选字后松手，不算点击 */
      if (downValid && (Math.abs(event.clientX - downX) > DRAG_TOLERANCE || Math.abs(event.clientY - downY) > DRAG_TOLERANCE)) {
        return;
      }

      /* 1) 工具条 */
      var tool = closestClass(target, 'ch-toolbar-btn', container);
      if (tool) {
        event.preventDefault();
        var action = tool.getAttribute('data-ch-action');
        setAll(sections, action === 'collapse');
        return;
      }

      /* 2) 标题左边的箭头 */
      var toggle = closestClass(target, 'ch-toggle', container);
      if (toggle) {
        event.preventDefault();
        var owner = toggle.parentNode && toggle.parentNode.parentNode;
        if (owner && editable(owner)) setCollapsed(owner, !isCollapsed(owner));
        return;
      }

      /* 3) 标题文字（标题里的链接除外） */
      var heading = closestClass(target, 'ch-heading', container);
      if (!heading) return;
      if (closestLink(target, container)) return;

      var section = heading.parentNode;
      if (section && editable(section)) setCollapsed(section, !isCollapsed(section));
    });
  }

  function setAll(sections, collapsed) {
    for (var i = 0; i < sections.length; i++) {
      if (editable(sections[i])) setCollapsed(sections[i], collapsed);
    }
  }

  /* ======================================================================== */
  /* 锚点跳转：先展开祖先，再滚动                                              */
  /* ======================================================================== */

  function expandAncestors(element) {
    var changed = false;
    var node = element;

    while (node) {
      if (isFolded(node) && isCollapsed(node)) {
        setCollapsed(node, false);
        changed = true;
      }
      node = node.parentNode;
    }
    return changed;
  }

  function insideContainers(element) {
    for (var i = 0; i < containers.length; i++) {
      if (containers[i].contains(element)) return true;
    }
    return false;
  }

  function resolveHashTarget() {
    var hash = window.location.hash;
    if (!hash || hash.length < 2) return null;

    var id = hash.slice(1);
    try {
      id = decodeURIComponent(id);
    } catch (err) {
      /* 不是合法的百分号编码，按原样找 */
    }

    var target = document.getElementById(id);
    if (!target) {
      var named = document.getElementsByName(id);
      if (named.length) target = named[0];
    }
    return target;
  }

  /**
   * @param {boolean} force 页面刚加载时为 true：因为折叠改变了页面高度，
   *                        浏览器之前的定位已经不准了，需要重新滚一次。
   *                        点击目录等场景为 false：没被折叠的话浏览器自己滚得就对，
   *                        不要重复滚动。
   */
  function revealHashTarget(force) {
    var target = resolveHashTarget();
    if (!target || !insideContainers(target)) return;

    var changed = expandAncestors(target);
    if (!force && !changed) return;

    window.requestAnimationFrame(function () {
      if (target.scrollIntoView) target.scrollIntoView(true);
    });
  }

  function bindAnchorNavigation() {
    document.addEventListener('click', function (event) {
      var target = event.target;
      if (!target || target.nodeType !== 1) return;

      var link = closestLink(target, document.body);
      if (!link) return;

      var href = link.getAttribute('href');
      if (!href || href.charAt(0) !== '#' || href.length < 2) return;

      /* 让浏览器先按它自己的方式处理（能滚就滚），随后我们再补展开 */
      window.setTimeout(function () {
        revealHashTarget(false);
      }, 0);
    });

    window.addEventListener('hashchange', function () {
      revealHashTarget(false);
    });
  }

  /* ======================================================================== */
  /* 初始化                                                                    */
  /* ======================================================================== */

  function setup(container) {
    if (container.getAttribute('data-ch-ready') === '1') return;
    container.setAttribute('data-ch-ready', '1');

    /* 先看看有没有标题，没有就什么都不做（正文保持原样展开） */
    var hasHeading = false;
    for (var i = 0; i < container.children.length; i++) {
      if (headingLevel(container.children[i])) {
        hasHeading = true;
        break;
      }
    }
    if (!hasHeading) return;

    buildToolbar(container);

    var sections = buildFolds(container);
    markEmptySections(sections);

    for (var j = 0; j < sections.length; j++) {
      if (editable(sections[j])) setCollapsed(sections[j], true); /* 默认全部折叠 */
    }

    containers.push(container);
    bindContainer(container, sections);
  }

  function init() {
    var built = false;

    try {
      var nodes = document.querySelectorAll(CONTAINER_SELECTOR);
      for (var i = 0; i < nodes.length; i++) setup(nodes[i]);
      if (containers.length) bindAnchorNavigation();
      built = true;
    } catch (err) {
      if (window.console && window.console.error) {
        window.console.error('[collapsible-headings]', err);
      }
    }

    /* 标记构造完成：防闪烁样式 (html.ch-js:not(.ch-built)) 随之失效 */
    document.documentElement.classList.add('ch-built');

    if (built) revealHashTarget(true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
