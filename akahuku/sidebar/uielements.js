export {Deck, TabContainer};

// xul-like custom elements

class TabContainer extends HTMLElement {
  static get observedAttributes() {
    return ['orient','hidden'];
  }

  constructor() {
    super();

    const sh = this.attachShadow({mode:'open'});
    sh.innerHTML = `
    <style>@import url('uielements.css');</style>
    <div class="content horizontal">
      <slot class="scrollbox"></slot>
      <button class="scrollbutton" name="scrollbutton-up" style="display: none;"></button>
      <button class="scrollbutton" name="scrollbutton-down" style="display: none;"></button>
      <select class="menubutton" name="menubutton" style="display: none;"></select>
    </div>
    `;
    this._style = sh.querySelector('style');
    this._content = sh.querySelector('.content');
    this._scrollbox = sh.querySelector('.scrollbox');
    this._scrollButtonUp = sh.querySelector('button[name=scrollbutton-up]');
    this._scrollButtonDown = sh.querySelector('button[name=scrollbutton-down]');
    this._menuButton = sh.querySelector('select[name=menubutton]');

    this._enableMenuButton = false;

    this._scrollbox.addEventListener('slotchange', (event)=>{
      this._onSlotChange(event);
    });

    this._scrollButtonUp.addEventListener('click', (event)=>{
      this._onClick_ScrollButtonUp(event);
    });
    this._scrollButtonDown.addEventListener('click', (event)=>{
      this._onClick_ScrollButtonDown(event);
    });
    this._menuButton.addEventListener('click', (event)=>{
      this._onClick_MenuButton(event);
    });
    this._menuButton.addEventListener('change', (event)=>{
      this.onSelectItem(event.target.value);
    });

    //Overflow/Underflow
    let overflowState = '';
    let rsobserver = new ResizeObserver((entries, obs)=>{
      for (const ent of entries) {
        if (ent.contentRect.width == 0) {
          continue;
        }
        const WH = (this.orient == 'horizontal' ? 'Width' : 'Height');
        if (this._scrollbox['scroll' + WH] > this._scrollbox['client' + WH]) {
          // overflow
          if (overflowState != 'overflow') {
            overflowState = 'overflow';
            this._onOverflow(new CustomEvent('overflow'));
          }
        }
        else { //if (this._scrollbox['scroll' + WH] == this._scrollbox['client' + WH]) {
          // underflow
          if (overflowState != 'underflow') {
            overflowState = 'underflow';
            this._onUnderflow(new CustomEvent('underflow'));
          }
        }
      }
    });
    rsobserver.observe(this._scrollbox);

    this._scrollbox.addEventListener('scroll', (event)=>{
      this._onScroll(event);
    });
    this._scrollbox.addEventListener('wheel', (event)=>{
      this._onWheel(event);
    });
  }

  connectedCallback() {
  }
  disconnectedCallback() {
  }
  adoptedCallback() {
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name == 'orient') {
      if (newValue == 'vertical') {
        this._content.classList.remove('horizontal');
        this._content.classList.add('vertical');
      } else {// if (newValue == 'horizontal') {
        this._content.classList.remove('vertical');
        this._content.classList.add('horizontal');
      }
    }
    else if (name == 'hidden') {
      if (oldValue === null && newValue !== null) {
        // Added attr
        this._content.style.display = 'none';
      } else if (oldValue !== null && newValue === null) {
        // Removed attr
        this._content.style.display = null;
      }
    }
  }

  _onSlotChange(event) {
    const options = new Map();
    for (const opt of this._menuButton.querySelectorAll('option')) {
      options.set(opt.value, opt);
    }
    for (const elm of this._scrollbox.assignedElements()) {
      const value = elm.id;
      if (!value) continue;
      if (!options.has(value)) {
        const opt = document.createElement('option');
        opt.value = value;
        opt.textContent = elm.textContent.trim();
        this._menuButton.append(opt);
      } else {
        const opt = options.get(value);
        options.delete(value);
        this._menuButton.append(opt);
      }
    }
    for (const opt of options) {
      opt.remove();
    }
  }

  // getter/setter for custom attributes

  get orient () {
    return this.getAttribute('orient');
  }
  set orient (value) {
    this.setAttribute('orient', value);
  }
  get hidden () {
    return this.getAttribute('hidden') == 'true';
  }
  set hidden (value) {
    if (value) {
      this.setAttribute('hidden', value);
    } else {
      this.removeAttribute('hidden');
    }
  }

  // Additional properties

  get menuEventListener () {
    return this._menuEventListener;
  }
  set menuEventListener (val) {
    this._menuEventListener = val;
  }

  get enableMenuButton () {
    return this._enableMenuButton;
  }
  set enableMenuButton (value) {
    this._enableMenuButton = value;
    if (this._enableMenuButton) {
      this._menuButton.style.display = '';
    }
    else {
      this._menuButton.style.display = 'none';
    }
  }

  // Methods

  ensureElementIsVisible (child) {
    child?.scrollIntoView?.({inline:'nearest', block:'nearest', behavior:'auto'});
  }
  openMenu () {
    // nothing to do
  }
  onSelectItem(id) {
    for (const tab of this._scrollbox.assignedElements()) {
      if (tab.id == id) {
        if (this._menuEventListener) {
          this._menuEventListener.onSelectItem(tab);
        } else {
          tab.click();
        }
        this.ensureElementIsVisible(tab);
        this._updateScrollButtonsDisabledState();
        break;
      }
    }
  }
  scrollByIndex(dindexes) {
    const XY = (this.orient == 'horizontal' ? 'Left' : 'Top');
    const currentScroll = this._scrollbox['scroll' + XY];
    let currentElement;
    for (const elm of this._scrollbox.assignedElements()) {
      const elmScroll = elm['offset' + XY];
      if (currentScroll <= elmScroll) {
        currentElement = elm;
        break;
      }
    }
    if (!currentElement || !(dindexes > 0 || dindexes < 0)) {
      return;
    }
    while (dindexes != 0 && currentElement) {
      if (dindexes > 0) {
        currentElement = currentElement.nextElementSibling;
        dindexes--;
      } else {
        currentElement = currentElement.previousElementSibling;
        dindexes++;
      }
    }
    currentElement?.scrollIntoView({inline:'start', block:'start', behavior:'auto'});
  }
  _updateScrollButtonsDisabledState() {
    let disableUpButton = false;
    let disableDownButton = false;

    const WH = (this.orient == 'horizontal' ? 'Width' : 'Height');
    const XY = (this.orient == 'horizontal' ? 'Left' : 'Top');
    const width = this._scrollbox['scroll' + WH];
    const xPos = this._scrollbox['scroll' + XY];
    const boxWidth = this._scrollbox['client' + WH];
    if (xPos == 0 ) {
      disableUpButton = true;
    }
    else if (boxWidth + xPos == width) {
      disableDownButton = true;
    }

    if (disableUpButton) {
      this._scrollButtonUp.setAttribute('disabled', 'true');
    } else {
      this._scrollButtonUp.removeAttribute('disabled');
    }
    if (disableDownButton) {
      this._scrollButtonDown.setAttribute('disabled', 'true');
    } else {
      this._scrollButtonDown.removeAttribute('disabled');
    }
  }

  // Internal event handlers

  _onWheel(event) {
    if (event.deltaY < 0) {
      this.scrollByIndex(-1);
    } else if (event.deltaY > 0) {
      this.scrollByIndex(1);
    }
    event.stopPropagation();
  }
  _onUnderflow(event) {
    this._scrollButtonUp.style.display = 'none';
    this._scrollButtonDown.style.display = 'none';
    const childNodes = this._scrollbox.assignedNodes();
    if (childNodes && childNodes.length) {
      this.ensureElementIsVisible(childNodes[0]);
      if (childNodes.length > 1) {
        this.ensureElementIsVisible(childNodes[childNodes.length - 1]);
      }
    }
    event.stopPropagation();
  }
  _onOverflow(event) {
    this._scrollButtonUp.style.display = '';
    this._scrollButtonDown.style.display = '';
    this._updateScrollButtonsDisabledState();
    event.stopPropagation ();
  }
  _onScroll(event) {
    this._updateScrollButtonsDisabledState();
  }

  _onClick_ScrollButtonUp(event) {
    this.scrollByIndex(-1);
    event.stopPropagation();
  }
  _onClick_ScrollButtonDown(event) {
    this.scrollByIndex(1);
    event.stopPropagation();
  }
  _onClick_MenuButton(event) {
    this.openMenu();
    event.stopPropagation();
  }
}

class Deck extends HTMLElement {
  static get observedAttributes() {
    return ['flex'];
  }

  constructor() {
    super();

    const shadow = this.attachShadow({mode:'open'});
    shadow.innerHTML = `
    <style>
    :host {
      position: relative;
    }
    slot {
      display: flex;
      flex-direction: column;
      position: absolute;
      width: 100%;
      height: 100%;
      z-index: 0;
    }
    slot[name="selected"] {
      z-index: 1;
      background-color: inherit;
    }
    slot::slotted(*) {
      position: absolute;
      width: 100%;
      height: 100%;
    }
    </style>
    <slot name="selected"></slot>
    <slot></slot>
    `;
  }

  connectedCallback() {
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name == 'flex') {
      this.style.flexGrow = newValue;
    }
  }

  get selectedPanel () {
    for (let node of this.children) {
      if (node.slot == 'selected') {
        return node;
      }
    }
    return null;
  }
  set selectedPanel (panel) {
    if (this != panel.parentNode)
      return;
    for (let node of this.children) {
      if (panel == node) {
        node.slot = "selected";
      } else {
        node.slot = "";
      }
    }
  }
}

