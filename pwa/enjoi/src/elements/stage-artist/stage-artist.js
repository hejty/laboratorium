import { format, addMinutes, isWithinRange } from 'date-fns';
import { encapsulate, fire } from '../../utils/utils';
import store from '../../store/store';
import { updateStatus } from '../../actions/artist';

export class StageArtist extends HTMLElement {
    constructor() {
        super();
        encapsulate(this);
    }

    static get observedAttributes() {
        return ['artist', 'status', 'score', 'start', 'minutes', 'index'];
    }

    connectedCallback() {
        this._onClick = this._onClick.bind(this);
        this._onTransitionEnd = this._onTransitionEnd.bind(this);
        this._onRangeInput = this._onRangeInput.bind(this);
        this._onRangeChange = this._onRangeChange.bind(this);
        this._onCountDownOver = this._onCountDownOver.bind(this);

        this.render();

        this._rangeEl = this.shadowRoot.querySelector('.live-range');
        this._progressEl = this.shadowRoot.querySelector('progress');
        this._statusEl = this.shadowRoot.querySelector('.status');

        if (this.classList.contains('live')) {
            this.addEventListener('click', this._onClick, { once: true });
            this.addEventListener('touchend', this._onClick, { once: true });
            this.addEventListener('transitionend', this._onTransitionEnd, {
                once: true
            });
            this.addEventListener('countdown-ended', this._onCountDownOver, {
                once: true
            });
        }
    }

    disconnectedCallback() {
        if (!this._rangeEl) return;
        this._rangeEl.removeEventListener('input', this._onRangeInput);
        this._rangeEl.removeEventListener('change', this._onRangeChange);
    }

    get artist() {
        return this.getAttribute('artist');
    }

    set artist(val) {
        this.setAttribute('artist', val);
    }

    get status() {
        return this.getAttribute('status');
    }

    set status(val) {
        if (val) {
            this._status = val;
        }
    }

    get live() {
        return this.getAttribute('live');
    }

    get score() {
        return this.getAttribute('score');
    }

    set score(val) {
        this.setAttribute('score', val);
    }

    get start() {
        return this.getAttribute('start');
    }

    get minutes() {
        return parseInt(this.getAttribute('minutes'), 10);
    }

    get index() {
        return this.getAttribute('index');
    }

    _onClick(event) {
        this.classList.add('opened');
        this._rangeEl.focus();
        fire('opened', {}, this);
    }

    _onTransitionEnd(event) {
        this._rangeEl.addEventListener('input', this._onRangeInput);
        this._rangeEl.addEventListener('change', this._onRangeChange);
    }

    _onRangeInput(event) {
        const newScore = event.target.value;
        this._progressEl.value = newScore;
        this._statusEl.textContent = `${newScore} %`;
    }

    _onRangeChange(event) {
        const newScore = event.target.value;
        const index = event.target.getAttribute('index');
        const stageId = store.getState().stage.stageId;
        this._progressEl.value = newScore;
        fire('score-changed', { score: newScore, id: index, stageId }, this);
    }

    _onCountDownOver() {
        store.dispatch(updateStatus(parseInt(this.index, 10)));
    }

    render() {
        const start = new Date(this.start);
        const end = addMinutes(start, this.minutes);
        const now = new Date();

        const distance = Math.floor((start - now) / 1000);
        const seconds = distance + this.minutes * 60;

        const isLive = isWithinRange(now, start, end);
        const startFormatted = format(this.start, 'HH:mm');

        if (isLive && this.status === 'live') {
            this.classList.add('live');
        }

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    align-items: center;
                    animation: translate 250ms ease 0s forwards;
                    background-color: var(--boring-grey-color);
                    box-shadow: 0 0 var(--shadow-spread) rgba(0, 0, 0, 0.1);
                    color: #808080;
                    display: flex;
                    flex: 1;
                    height: 100%;
                    justify-content: center;
                    min-width: 200px;
                    position: relative;
                    text-align: center;
                    transform: translateY(100%);
                    transition: flex 250ms var(--custom-easing);
                    will-change: transform;
                    z-index: 1;
                }

                @keyframes translate {
                    from { transform: translateY(100%); }
                    to { transform: translateY(0); }
                }

                :host(.opened) {
                    flex: 2;
                }

                .enjoi-bar {
                    height: 100%;
                    position: absolute;
                    width: 100%;
                    z-index: -1;
                }

                .enjoi-bar input {
                    height: 100%;
                    left: 0;
                    margin: 0;
                    outline: none;
                    position: absolute;
                    transform: rotate(-90deg);
                    vertical-align: middle;
                    width: 100vh;
                    z-index: 1;
                }

                :host(.live) .enjoi-bar input {
                    cursor: ns-resize;
                }

                .enjoi-bar progress {
                    -webkit-appearance: none;
                    appearance: none;
                    height: 100%;
                    left: 0;
                    position: absolute;
                    top: 0;
                    transform: rotate(-90deg);
                    width: 100vh;
                }

                .enjoi-bar progress::-webkit-progress-bar {
                    background-color: var(--boring-grey-color);
                }

                .enjoi-bar progress::-webkit-progress-value {
                    background-color: #808080;
                }

                :host(.live) .enjoi-bar progress::-webkit-progress-bar {
                    background-color: white;
                }

                :host(.live) .enjoi-bar progress::-webkit-progress-value {
                    background-color: var(--enjoi-color);
                }

                :host(.live) {
                    background-color: white;
                    box-shadow: 0 0 var(--shadow-spread) rgba(0, 0, 0, 0.35);
                    cursor: pointer;
                    z-index: 2;
                }

                .bar {
                    height: 100%;
                    overflow: hidden;
                    position: relative;
                    width: 100%;
                }

                .artist {
                    color: #606060;
                    mix-blend-mode: darken;
                    text-transform: uppercase;
                    writing-mode: vertical-rl;
                }

                :host(.live) .artist {
                    color: var(--highlight-color);
                    mix-blend-mode: multiply;
                }

                .status {
                    background-color: #666;
                    bottom: 15vh;
                    border-radius: 50%;
                    color: var(--boring-grey-color);
                    display: flex;
                    font-size: 20px;
                    height: var(--status-size);
                    justify-content: center;
                    line-height: var(--status-size);
                    position: absolute;
                    text-transform: uppercase;
                    width: var(--status-size);
                }

                :host(.live) .status {
                    background-color: var(--highlight-color);
                    color: white;
                }

                countdown-timer {
                    background-color: #808080;
                    bottom: 5vh;
                    color: white;
                    font-size: 16px;
                    padding: 8px 10px;
                    position: absolute;
                }
            </style>
            
            <strong class="artist">${this.artist}</strong>
            <span class="status">${this.status}</span>

            <countdown-timer seconds="${seconds}" status="${this
            .status}" start="${startFormatted}"></countdown-timer>

            <div class="enjoi-bar">
                <div class="bar">
                    <input type="range" class="${this.status === 'live'
                        ? 'live-range'
                        : 'range'}" value="${this.score}" index="${this
            .index}" min="0" max="100" step="5">
                    <progress value="${this.score}" max="100"></progress>
                </div>
            </div>
        `;
    }
}