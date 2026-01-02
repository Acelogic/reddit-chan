// ==UserScript==
// @name         Reddit-Chan
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Chain 4chan comments like Reddit
// @author       Antigravity
// @match        *://boards.4chan.org/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    console.log("Starting Reddit-Chan...");

    // --- STATE MANAGEMENT ---
    let currentMode = 'unknown'; // 'index' or 'thread' or 'catalog'

    function updateMode() {
        const loc = window.location.href;
        const hash = window.location.hash;
        const title = document.title;
        const indexMode = document.getElementById('index-mode'); // 4chan X dropdown

        const isCatalog = 
            loc.includes('/catalog') || 
            title.includes('Catalog') || 
            (hash === '#catalog') ||
            (indexMode && indexMode.value === 'catalog') ||
            (document.getElementById('catalog') && !loc.includes('/thread/'));

        if (isCatalog) {
            return setMode('catalog');
        } else if (loc.includes('/thread/') || hash.includes('/thread/')) { // X uses hashes sometimes
            return setMode('thread');
        } else {
            return setMode('index');
        }
    }

    function setMode(mode) {
        if (currentMode === mode) return;
        currentMode = mode;
        console.log(`[Reddit-Chan] Switching to mode: ${mode}`);
        
        document.body.classList.remove('is-index-view', 'is-thread-view', 'is-catalog-view');
        if (mode === 'index') document.body.classList.add('is-index-view');
        if (mode === 'thread') document.body.classList.add('is-thread-view');
        if (mode === 'catalog') document.body.classList.add('is-catalog-view');
        
        // Re-process view specific logic if needed immediately
        if (mode !== 'catalog') runMainProcessor();
    }

    // --- GLOBAL CSS ---
    const style = document.createElement('style');
    style.innerHTML = `
        /* Shared */
        body.is-index-view, body.is-thread-view { margin-right: 320px !important; }
        
        /* Sidebar */
        #reddit-sidebar {
            position: fixed; top: 0; right: 0; width: 300px; height: 100vh;
            background-color: #f7f7f7; border-left: 1px solid #c6c6c6;
            padding: 10px; overflow-y: auto; z-index: 9999; box-sizing: border-box;
            font-family: verdana, arial, helvetica, sans-serif;
            display: none; /* Hidden by default, shown in view modes */
        }
        body.is-index-view #reddit-sidebar, body.is-thread-view #reddit-sidebar { display: block; }
        
        /* Sidebar Content Styles */
        #reddit-sidebar .sr-header { font-size: 16px; font-weight: bold; margin-bottom: 10px; color: #333; text-align: center; }
        #reddit-sidebar .search-box { width: 100%; padding: 5px; margin-bottom: 15px; border: 1px solid #c6c6c6; }
        #reddit-sidebar .action-btn { display: block; width: 100%; padding: 8px; margin-bottom: 10px; text-align: center; background: #ffffff; border: 1px solid #c6c6c6; color: #333; font-weight: bold; cursor: pointer; text-decoration: none; }
        #reddit-sidebar .action-btn:hover { background: #f0f0f0; }
        #reddit-sidebar .submit-link { background: #ebf3fc; border-color: #5f99cf; color: #5f99cf; }
        #reddit-sidebar .sub-info { font-size: 11px; margin-top: 20px; line-height: 1.5; border: 1px solid #e0e0e0; background: #fff; padding: 5px; }

        /* --- THREAD VIEW STYLES --- */
        body.is-thread-view .thread > .postContainer:not(.opContainer) {
            border: 1px solid #7c7c7c !important; 
            background-color: rgba(255,255,255,0.05);
            margin-bottom: 10px !important;
            border-radius: 4px; padding: 5px; overflow: hidden;
        }
        body.is-thread-view .post {
            border: none !important; border-bottom: none !important; 
            box-shadow: none !important; background: transparent !important;
            padding: 2px 0px !important; display: block !important; max-width: 100%; 
        }
        body.is-thread-view .postContainer { margin: 0 !important; padding: 0 !important; }
        body.is-thread-view .replies-container {
            margin-left: 15px !important; padding-left: 15px !important; 
            border-left: 1px solid #dcdcdc !important; 
        }
        body.is-thread-view .replies-container:hover { border-left-color: #888 !important; }
        body.is-thread-view .collapse-btn { cursor: pointer; margin-right: 6px; font-size: 10px; vertical-align: middle; color: #555; user-select: none; font-family: monospace; }
        body.is-thread-view .nameBlock.op-user .name, body.is-thread-view .nameBlock.op-user .postertrip { color: #0055DF !important; font-weight: bold; background-color: transparent !important; }
        body.is-thread-view .nameBlock.op-user:after { content: " [OP]"; color: #0055DF; font-weight: bold; font-size: 0.8em; }
        body.is-thread-view .post.collapsed .postMessage, body.is-thread-view .post.collapsed .file, body.is-thread-view .post.collapsed .postInfo .backlink, body.is-thread-view .post.collapsed + .replies-container { display: none !important; }
        body.is-thread-view .post.collapsed { padding: 2px 4px !important; opacity: 0.7; border: none !important; }

        /* --- INDEX VIEW STYLES --- */
        body.is-index-view .replyContainer, body.is-index-view .summary { display: none !important; }
        
        body.is-index-view .board .thread {
            display: flex;
            flex-direction: row;
            background: #fff;
            border: 1px solid #ccc;
            margin-bottom: 8px !important;
            padding: 6px;
            border-radius: 4px;
            clear: both;
            min-height: 80px; 
            height: auto;
            overflow: visible;
        }
        body.is-index-view .board .thread:hover {
            border-color: #898989;
            background-color: #f8f8f8;
        }
        body.is-index-view .postContainer.opContainer {
            display: flex !important;
            align-items: center;
            width: 100%;
        }
        body.is-index-view .opContainer .post.op {
             display: flex !important;
             width: 100%;
             background: transparent !important;
             border: none !important;
             flex-direction: row;
             align-items: flex-start;
        }
        body.is-index-view .file { 
            display: block !important; 
            margin-right: 12px !important; 
            margin-bottom: 0 !important;
            flex-shrink: 0;
        }
        body.is-index-view .fileThumb { 
            max-width: 70px !important; 
            max-height: 70px !important; 
            width: auto; height: auto;
            float: none !important;
        }
        body.is-index-view .fileText { display: none !important; }
        
        body.is-index-view .postInfo { 
            /* Hidden by default in wrapper unless moved, but we need raw style for extracted logic */
            /* We will style it inside the wrapper */
        } 
        
        /* Wrapper Styles */
        .reddit-content-wrapper {
             /* Handled in JS inline mostly, but good to have base */
        }
        
        /* Hide original elements if they are not inside our wrapper yet (FOUC prevention) */
        body.is-index-view .postMessage { display: none !important; }
        body.is-index-view .subject { display: none !important; } /* Hide original subject span */
        
        /* Reddit Styles */
        .subject-link {
            font-size: 16px; 
            color: #0000FF; 
            font-weight: bold;
            display: block; 
            margin-bottom: 4px;
            text-decoration: none;
            line-height: 1.2; 
            padding-top: 2px;
        }
        .subject-link:hover { text-decoration: underline; }
        
        .reddit-footer {
            font-size: 12px;
            font-weight: bold;
            color: #888;
            margin-top: 4px;
        }
        .reddit-footer a { color: #888; text-decoration: none; }
        .reddit-footer a:hover { text-decoration: underline; }
        body.is-index-view .postInfo input[type=checkbox] { display: none !important; }
        body.is-index-view .postNum { font-size: 0.9em; margin-left: 5px; }

        /* Modal Styles */
        #reddit-post-modal {
            display: none;
            position: fixed;
            z-index: 10000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            overflow: auto;
            background-color: rgba(0,0,0,0.6);
            backdrop-filter: blur(2px);
            align-items: center;
            justify-content: center;
        }
        #reddit-post-content {
            background-color: #fefefe;
            margin: auto;
            padding: 20px;
            border: 1px solid #888;
            width: auto;
            max-width: 600px;
            box-shadow: 0 4px 8px 0 rgba(0,0,0,0.2);
            border-radius: 4px;
            position: relative;
        }
        /* Native form override to force display in modal */
        #postForm {
             display: table !important; 
             margin: 0 auto;
        }

        /* Ultra Compact View Styles */
        body.is-index-view.is-compact-view .board .thread {
            min-height: 52px;
            padding: 0;
            margin-bottom: -1px !important;
            border-radius: 0;
            border-left: none;
            border-right: none;
            align-items: center;
        }
        body.is-index-view.is-compact-view .postContainer.opContainer,
        body.is-index-view.is-compact-view .opContainer .post.op {
            align-items: center;
        }
        
        /* Vote Column */
        .reddit-vote-box {
            display: none;
            width: 40px;
            text-align: center;
            flex-direction: column;
            align-items: center;
            color: #c6c6c6;
            font-weight: bold;
            font-family: arial, verdana, sans-serif;
            margin-right: 8px;
            padding-top: 4px;
        }
        body.is-index-view.is-compact-view .reddit-vote-box {
            display: flex;
        }
        .vote-arrow { color: #c6c6c6; font-size: 14px; }
        .vote-count { font-size: 11px; margin: 2px 0; color: #898989; }

        /* Thumb */
        body.is-index-view.is-compact-view .fileThumb {
            width: 50px !important;
            height: 50px !important;
            margin: 0 8px 0 0 !important;
            display: flex !important;
            align-items: center;
            justify-content: center;
        }
        body.is-index-view.is-compact-view .fileThumb img {
            width: 50px !important;
            height: 50px !important;
            max-width: 50px !important;
            max-height: 50px !important;
            object-fit: cover !important;
            border-radius: 3px;
        }
        
        /* Typography */
        body.is-index-view.is-compact-view .subject-link {
            font-size: 15px;
            font-weight: normal; 
            margin-bottom: 0px;
            display: inline;
        }
        body.is-index-view.is-compact-view .subject-link:visited { color: #551a8b; }
        
        /* Footer/Meta */
        body.is-index-view.is-compact-view .reddit-footer {
            font-size: 10px;
            margin-top: 1px;
            color: #888;
        }
        body.is-index-view.is-compact-view .reddit-content-wrapper {
             padding: 4px 0;
             justify-content: center;
        }

        /* Text Size Variants */
        body.is-compact-view.text-size-s .subject-link { font-size: 13px !important; }
        body.is-compact-view.text-size-s .reddit-footer { font-size: 9px !important; }
        
        body.is-compact-view.text-size-m .subject-link { font-size: 15px !important; } /* Default */
        body.is-compact-view.text-size-m .reddit-footer { font-size: 10px !important; }

        body.is-compact-view.text-size-l .subject-link { font-size: 17px !important; }
        body.is-compact-view.text-size-l .reddit-footer { font-size: 11px !important; }
    `;
    document.head.appendChild(style);

    // Sidebar Injection
    const sidebar = document.createElement('div');
    sidebar.id = 'reddit-sidebar';
    sidebar.innerHTML = `
        <div class="sr-header">/g/ - Technology</div>
        
        <!-- View Toggle -->
        <div style="font-size: 11px; text-align: right; margin-bottom: 8px; color: #888;">
            View: <a href="#" id="view-card" style="font-weight: bold; color: #333; text-decoration: none;">Card</a> | 
                  <a href="#" id="view-compact" style="color: #0055DF; text-decoration: none;">Compact</a>
            <br><br>
            Text: <a href="#" id="text-s" style="color:#0055DF; text-decoration:none;">S</a> | 
                  <a href="#" id="text-m" style="color:#333; font-weight:bold; text-decoration:none;">M</a> | 
                  <a href="#" id="text-l" style="color:#0055DF; text-decoration:none;">L</a>
        </div>

        <input type="text" class="search-box" placeholder="search">
        <a href="#" id="submit-link-btn" class="action-btn submit-link">Submit a new Link</a>
        <a href="#" id="submit-text-btn" class="action-btn">Submit a new Text Post</a>
        <div class="sub-info">
            <strong>Technology</strong><br>
            Use the catalog.<br><br>
            <span style="color:red">3,542</span> readers<br>
            <span style="color:green">~155</span> users here now
        </div>
    `;
    if (!document.getElementById('reddit-sidebar')) {
        document.body.appendChild(sidebar);
        
        // Bind Modal Events
        document.getElementById('submit-link-btn').addEventListener('click', (e) => {
            e.preventDefault();
            openPostModal();
        });
        document.getElementById('submit-text-btn').addEventListener('click', (e) => {
            e.preventDefault();
            openPostModal();
        });

        // View Toggle Events
        const cardBtn = document.getElementById('view-card');
        const compactBtn = document.getElementById('view-compact');
        
        cardBtn.addEventListener('click', (e) => { e.preventDefault(); setViewMode('card'); });
        compactBtn.addEventListener('click', (e) => { e.preventDefault(); setViewMode('compact'); });
        
        updateViewToggleUI(localStorage.getItem('4chan_view_mode') || 'card');

        // Text Size Events
        const btnS = document.getElementById('text-s');
        const btnM = document.getElementById('text-m');
        const btnL = document.getElementById('text-l');
        
        btnS.addEventListener('click', (e) => { e.preventDefault(); setTextSize('s'); });
        btnM.addEventListener('click', (e) => { e.preventDefault(); setTextSize('m'); });
        btnL.addEventListener('click', (e) => { e.preventDefault(); setTextSize('l'); });

        setTextSize(localStorage.getItem('4chan_text_size') || 'm');
    }

    // Modal Injection
    if (!document.getElementById('reddit-post-modal')) {
        const modal = document.createElement('div');
        modal.id = 'reddit-post-modal';
        modal.innerHTML = '<div id="reddit-post-content"></div>';
        document.body.appendChild(modal);
        
        // Close on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closePostModal();
        });
    }

    // View Mode Logic
    function setViewMode(mode) {
        localStorage.setItem('4chan_view_mode', mode);
        updateViewToggleUI(mode);
        if (mode === 'compact') {
            document.body.classList.add('is-compact-view');
        } else {
            document.body.classList.remove('is-compact-view');
        }
    }

    function updateViewToggleUI(mode) {
        const cardBtn = document.getElementById('view-card');
        const compactBtn = document.getElementById('view-compact');
        if (!cardBtn || !compactBtn) return;
        
        if (mode === 'compact') {
            compactBtn.style.fontWeight = 'bold';
            compactBtn.style.color = '#333';
            cardBtn.style.fontWeight = 'normal';
            cardBtn.style.color = '#0055DF';
        } else {
            cardBtn.style.fontWeight = 'bold';
            cardBtn.style.color = '#333';
            compactBtn.style.fontWeight = 'normal';
            compactBtn.style.color = '#0055DF';
        }
    }

    function setTextSize(size) {
        localStorage.setItem('4chan_text_size', size);
        
        document.body.classList.remove('text-size-s', 'text-size-m', 'text-size-l');
        document.body.classList.add(`text-size-${size}`);

        const btnS = document.getElementById('text-s');
        const btnM = document.getElementById('text-m');
        const btnL = document.getElementById('text-l');
        
        if (!btnS || !btnM || !btnL) return;

        [btnS, btnM, btnL].forEach(btn => {
            btn.style.fontWeight = 'normal';
            btn.style.color = '#0055DF';
        });

        const activeBtn = size === 's' ? btnS : (size === 'l' ? btnL : btnM);
        activeBtn.style.fontWeight = 'bold';
        activeBtn.style.color = '#333';
    }

    // Modal Logic
    let originalParent = null;
    let originalNextSibling = null;

    function openPostModal() {
        const modal = document.getElementById('reddit-post-modal');
        const content = document.getElementById('reddit-post-content');
        
        // Try to find the form. Native is name="post", 4chan X might differ but usually same structure.
        // #postForm is the table ID in native.
        let form = document.querySelector('form[name="post"]');
        if (!form) form = document.getElementById('postForm'); 

        if (!form || !modal || !content) {
            console.error("Form or Modal not found");
            return;
        }

        // Save location if not already moved
        if (form.parentNode !== content) {
            originalParent = form.parentNode;
            originalNextSibling = form.nextSibling;
            content.appendChild(form);
        }
        
        modal.style.display = 'flex';
        
        // Force display
        form.style.display = 'block';
        if (form.id === 'postForm') form.style.display = 'table'; // Native uses table
        
        // Hide native toggles if any
        const toggleLink = document.getElementById('togglePostFormLink');
        if (toggleLink) toggleLink.style.display = 'none';
    }

    function closePostModal() {
        const modal = document.getElementById('reddit-post-modal');
        let form = document.querySelector('form[name="post"]');
        if (!form) form = document.getElementById('postForm');

        if (form && originalParent) {
             originalParent.insertBefore(form, originalNextSibling);
        }
        
        if (modal) modal.style.display = 'none';
        
        // Restore toggle link potentially?
        const toggleLink = document.getElementById('togglePostFormLink');
        if (toggleLink) toggleLink.style.display = 'block';
    }

    // Helper to get post ID
    function getPostId(postContainer) {
        const idAttr = postContainer.id;
        return idAttr ? idAttr.replace('pc', '') : null;
    }

    // --- DOM PROCESSORS ---
    
    function processIndexThread(thread) {
        const op = thread.querySelector('.opContainer');
        if(!op) return;
        const post = op.querySelector('.post.op');
        if (!post) return;
        
        let contentWrapper = post.querySelector('.reddit-content-wrapper');
        // Do NOT return early. Always refresh content to fix blank/stale titles.

        const postInfo = post.querySelector('.postInfo');
        const subject = post.querySelector('.subject');
        const message = post.querySelector('.postMessage');
        const fileText = post.querySelector('.fileText');
        const fileLink = fileText ? fileText.querySelector('a') : null;

        // 1. Ensure Subject (Priority: Subject > Message > Filename > Default)
        let titleText = subject ? (subject.textContent || "").trim() : "";
        if (!titleText) {
             if (message) {
                 const rawText = message.textContent || "";
                 if (rawText.trim()) {
                    titleText = rawText.trim().split('\n')[0].substring(0, 100);
                    if (rawText.length > 100) titleText += "...";
                 }
             }
             if (!titleText && fileLink) {
                 titleText = fileLink.textContent || ""; // Use filename if nothing else
             }
             if (!titleText) titleText = "Untitled Thread";
        }
        
        // 2. Wrapper (Create if missing)
        if (!contentWrapper) {
            contentWrapper = document.createElement('div');
            contentWrapper.className = 'reddit-content-wrapper';
            // Adjusted styles to prevent clipping
            contentWrapper.style.cssText = 'display: flex; flex-direction: column; justify-content: center; margin-left: 10px; flex: 1; overflow: hidden; padding-top: 2px; padding-bottom: 2px;';
            post.appendChild(contentWrapper);
        }

        // Vote Box Injection
        if (!thread.querySelector('.reddit-vote-box')) {
             const voteBox = document.createElement('div');
             voteBox.className = 'reddit-vote-box';
             // Random score for aesthetic
             const score = Math.floor(Math.random() * 500) + 20; 
             voteBox.innerHTML = `
                 <div class="vote-arrow" style="margin-bottom:-2px">▲</div>
                 <div class="vote-count">${score}</div>
                 <div class="vote-arrow" style="margin-top:-2px">▼</div>
             `;
             // Insert before the OP post container or inside thread, needs to be flex child 1
             // Structure is Thread -> OP Container -> Post
             // We want Vote -> Thumb -> Content
             // Since Thumb/Content are in Post, we should probably stick Vote inside Post at start
             post.insertBefore(voteBox, post.firstChild);
        }

        // 3. Subject Link (Update or Create)
        const postNum = op.querySelector('.postNum a');
        const href = postNum ? postNum.getAttribute('href') : '#';
        
        let link = contentWrapper.querySelector('.subject-link');
        if (!link) {
            link = document.createElement('a');
            link.className = 'subject-link'; 
            // Insert at top
            contentWrapper.insertBefore(link, contentWrapper.firstChild);
        }
        // Always update text and href
        link.href = href;
        link.textContent = titleText;

        // 4. Move Meta (Post Info)
        if (postInfo && postInfo.parentNode !== contentWrapper) {
            contentWrapper.appendChild(postInfo);
            postInfo.style.cssText = 'display: block; font-size: 10px; margin-top: 2px;';
        }

        // 5. METADATA EXTRACTION
        // Author
        const nameBlock = post.querySelector('.nameBlock');
        const authorName = nameBlock ? nameBlock.textContent.trim().replace(/\s+/g, ' ') : 'Anonymous';
        
        // Time
        const dateTime = post.querySelector('.dateTime');
        let timeAgoStr = 'sometime ago';
        if (dateTime) {
             let timestamp = 0;
             if (dateTime.dataset.utc) {
                 timestamp = parseInt(dateTime.dataset.utc, 10) * 1000;
             }
             if (timestamp) timeAgoStr = timeAgo(timestamp);
        }

        // Replies (Total = Visible + Omitted)
        let totalReplies = 0;
        const visibleReplies = thread.querySelectorAll('.replyContainer').length;
        totalReplies += visibleReplies;
        const summary = thread.querySelector('.summary');
        if (summary) {
            const match = summary.textContent.match(/(\d+)\s+posts?/);
            if (match && match[1]) {
                totalReplies += parseInt(match[1], 10);
            }
        }
        const commentLabel = totalReplies === 1 ? 'comment' : 'comments';

        // 6. Comments Link & Footer (Update or Create)
        let footer = contentWrapper.querySelector('.reddit-footer');
        if (!footer) {
             footer = document.createElement('div');
             footer.className = 'reddit-footer';
             contentWrapper.appendChild(footer);
        }
        
        // Reddit Style Footer
        footer.innerHTML = `
            submitted ${timeAgoStr} by <strong>${authorName}</strong>
            <br>
            <a href="${href}" style="color: #888; text-decoration: none; font-weight: bold;">${totalReplies} ${commentLabel}</a>
            <span style="margin: 0 5px; color: #ccc;">|</span>
            <a href="${href}" style="color: #888; text-decoration: none; font-weight: bold;">Share</a>
            <span style="margin: 0 5px; color: #ccc;">|</span>
            <a href="${href}" style="color: #888; text-decoration: none; font-weight: bold;">Save</a>
        `;
    }

    function timeAgo(timestamp) {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + " years ago";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + " months ago";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + " days ago";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + " hours ago";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + " minutes ago";
        return Math.floor(seconds) + " seconds ago";
    }
    
    function processThreadView() {
        // --- 4chan X CONFLICT FIX ---
        // 4chan X injects .inline and .clone elements for previews. We must ignore them.
        // We also need strict idempotency (data-reddit-processed) to prevent recursion loops if X updates the thread.

        const postContainers = Array.from(document.querySelectorAll('.postContainer'));
        const opContainer = document.querySelector('.opContainer');
        const opId = opContainer ? getPostId(opContainer) : null;
        
        // Build map first (only valid, main posts)
        const postMap = {};
        postContainers.forEach(pc => {
             // Ignore 4chan X clones/inlines for the MAP source
             if (pc.closest('.inline') || pc.classList.contains('inline') || pc.closest('.clone')) return;
             
             const id = getPostId(pc);
             if(id) postMap[id] = pc;
        });

        postContainers.forEach(pc => {
             // 1. IGNORE CHECKS
             // Already processed?
             if (pc.dataset.redditProcessed === 'true') return;
             
             // Is it a 4chan X artifact?
             if (pc.closest('.inline') || pc.classList.contains('inline') || pc.closest('.clone')) return;

             const id = getPostId(pc);
             if(!id) return;
             
             const post = pc.querySelector('.post');
             if(!post) return;

             // Mark as processed immediately to prevent loops
             pc.dataset.redditProcessed = 'true';

             // OP Highlight (Check if already done)
             const nameBlock = post.querySelector('.nameBlock');
             if (opId && id === opId && nameBlock && !nameBlock.classList.contains('op-user')) {
                 nameBlock.classList.add('op-user');
             }
             
             // Replies container
             if (!pc.querySelector('.replies-container')) {
                const rc = document.createElement('div');
                rc.className = 'replies-container';
                pc.appendChild(rc);
             }
             
             // Collapse btn
             const postInfo = post.querySelector('.postInfo');
             if (postInfo && !postInfo.querySelector('.collapse-btn')) {
                const btn = document.createElement('span');
                btn.className = 'collapse-btn';
                btn.textContent = '[-]'; 
                btn.onclick = (e) => {
                    e.stopPropagation(); 
                    post.classList.toggle('collapsed');
                    btn.textContent = post.classList.contains('collapsed') ? '[+]' : '[-]';
                };
                postInfo.insertBefore(btn, postInfo.firstChild);
             }
             
             // Threading (Nesting)
             // Only do this if not OP
             if (pc.classList.contains('opContainer')) return;
             
             // STRICT CHECK: If already nested, don't move it again.
             // This prevents the infinite loop if 4chan X clones the post and triggers a mutation which we then process again.
             if (pc.parentNode.classList.contains('replies-container')) return;

             const message = pc.querySelector('.postMessage') || pc.querySelector('.message');
             if (!message) return;
             
             // Find parent
             const quotes = message.querySelectorAll('.quotelink');
             let parentId = null;
             for (let quote of quotes) {
                const href = quote.getAttribute('href');
                if (href && href.startsWith('#p')) {
                    const quotedId = href.replace('#p', '');
                    if (quotedId !== opId && postMap[quotedId] && quotedId !== id) {
                        parentId = quotedId; break;
                    }
                }
             }
             
             if (parentId) {
                const parentPc = postMap[parentId];
                // Ensure we don't nest into ourselves or invalid parents
                if (parentPc && !parentPc.contains(pc)) {
                    const parentRc = parentPc.querySelector('.replies-container');
                    if (parentRc) {
                        parentRc.appendChild(pc); // MOVE the element
                    }
                }
             }
        });
    }

    // --- SIDEBAR LOGIC ---

    function renderSidebarWidget(topThreads) {
        const sidebar = document.getElementById('reddit-sidebar');
        if (!sidebar) return;

        let widget = document.getElementById('top-threads-widget');
        if (!widget) {
            widget = document.createElement('div');
            widget.id = 'top-threads-widget';
            widget.style.marginTop = '20px';
            widget.style.borderTop = '1px solid #e0e0e0';
            widget.style.paddingTop = '10px';
            
            const subInfo = sidebar.querySelector('.sub-info');
            if (subInfo) {
                subInfo.parentNode.insertBefore(widget, subInfo.nextSibling);
            } else {
                sidebar.appendChild(widget);
            }
        }

        let html = '<div style="font-weight:bold; color:#333; margin-bottom:10px;">Top Threads</div>';
        if (!topThreads || topThreads.length === 0) {
            html += '<div style="font-size:11px; color:#888;">No threads found.</div>';
        } else {
            topThreads.forEach(t => {
                let displayTitle = t.title;
                if (displayTitle.length > 40) displayTitle = displayTitle.substring(0, 40) + '...';
                
                html += `
                    <div style="margin-bottom: 8px; font-size: 11px;">
                        <a href="${t.href}" style="text-decoration: none; color: #0055DF; font-weight: bold;">${displayTitle}</a>
                        <span style="color: #666; font-size: 10px;">(${t.replyCount})</span>
                    </div>
                `;
            });
        }
        widget.innerHTML = html;
    }

    function updateSidebar() {
        if (currentMode !== 'index') return;

        const threads = Array.from(document.querySelectorAll('.board .thread'));
        const threadData = [];

        threads.forEach(thread => {
            // 1. Get Title & Link
            let title = "Untitled";
            let href = "#";
            
            const wrapper = thread.querySelector('.reddit-content-wrapper');
            if (wrapper) {
                const link = wrapper.querySelector('.subject-link');
                if (link) {
                    title = link.textContent;
                    href = link.getAttribute('href');
                }
            } else {
                // Fallback 
                const op = thread.querySelector('.opContainer');
                const postNum = op ? op.querySelector('.postNum a') : null;
                if (postNum) href = postNum.getAttribute('href');
            }

            // 2. Calculate Replies
            let replyCount = 0;
            const visibleReplies = thread.querySelectorAll('.replyContainer').length;
            replyCount += visibleReplies;

            const summary = thread.querySelector('.summary');
            if (summary) {
                const match = summary.textContent.match(/(\d+)\s+posts?/);
                if (match && match[1]) {
                    replyCount += parseInt(match[1], 10);
                }
            }
            
            threadData.push({ title, href, replyCount });
        });

        // 3. Sort & Slice (Top 20)
        threadData.sort((a, b) => b.replyCount - a.replyCount);
        const topThreads = threadData.slice(0, 20);

        // 4. Save to Cache
        try {
            sessionStorage.setItem('4chan_top_threads', JSON.stringify(topThreads));
        } catch(e) { console.error('Storage failed', e); }

        // 5. Render
        renderSidebarWidget(topThreads);
    }

    function restoreSidebar() {
        // Only run if we are NOT in index mode (or if we want to force load)
        // But typically we reuse the sidebar if it exists? 
        // 4chan reloads page on navigation, so sidebar is recreated.
        // We need to fetch data.
        
        try {
            const data = sessionStorage.getItem('4chan_top_threads');
            if (data) {
                const topThreads = JSON.parse(data);
                renderSidebarWidget(topThreads);
            }
        } catch(e) { console.error('Restore failed', e); }
    }

    function runMainProcessor() {
        if (currentMode === 'index') {
            const threads = document.querySelectorAll('.board .thread');
            threads.forEach(processIndexThread);
            updateSidebar(); 
        } else if (currentMode === 'thread') {
            processThreadView(); 
            restoreSidebar(); // Restore sidebar from cache in thread view
        }
    }

    // --- INIT & OBSERVER ---
    
    // Initial run
    updateMode();
    // Initialize View Mode
    setViewMode(localStorage.getItem('4chan_view_mode') || 'card');
    
    // Continuous Observation
    // Continuous Observation
    const observer = new MutationObserver((mutations) => {
        let needsUpdate = false;
        
        for(let m of mutations) {
            // 1. New nodes added
            if (m.addedNodes.length > 0) {
                for (const node of m.addedNodes) {
                    if (node.nodeType === 1 && (node.classList.contains('thread') || node.classList.contains('postContainer'))) {
                        needsUpdate = true;
                        break;
                    }
                    if (node.nodeType === 1 && node.querySelector && (node.querySelector('.thread') || node.querySelector('.postContainer'))) {
                        needsUpdate = true;
                        break;
                    }
                    // Check for subject injection (span.subject)
                    if (node.nodeType === 1 && node.classList.contains('subject')) {
                        needsUpdate = true; // Subject added later
                        break;
                    }
                }
            }
            
            // 2. Character data changed (text updates) OR ChildList changed inside a thread
            // This filters relevant changes inside a thread but outside our wrapper.
            if (!needsUpdate && (m.type === 'characterData' || m.type === 'childList')) {
                let parent = m.target.parentElement;
                let insideThread = false;
                let insideWrapper = false;
                
                while (parent && parent !== document.body) {
                    if (parent.classList && parent.classList.contains('reddit-content-wrapper')) {
                        insideWrapper = true;
                        break; 
                    }
                    if (parent.classList && (parent.classList.contains('thread') || parent.classList.contains('postContainer'))) {
                        insideThread = true;
                        // Don't break immediately, keep checking if we are inside wrapper too?
                        // No, traversal is bottom-up. If we hit wrapper first, we break.
                        // If we hit thread first (without hitting wrapper), then we are safe.
                        break;
                    }
                    parent = parent.parentElement;
                }
                
                if (insideThread && !insideWrapper) {
                    needsUpdate = true;
                }
            }
            
            if (needsUpdate) break;
        }
        
        if (needsUpdate) {
            updateMode(); 
            runMainProcessor();
        }
    });
    
    // observe characterData too for text changes
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    console.log("Reddit-Chan v2 Loaded (SPA + 4chanX Support)");
})();
