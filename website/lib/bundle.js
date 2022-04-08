
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    let src_url_equal_anchor;
    function src_url_equal(element_src, url) {
        if (!src_url_equal_anchor) {
            src_url_equal_anchor = document.createElement('a');
        }
        src_url_equal_anchor.href = url;
        return element_src === src_url_equal_anchor.href;
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        if (value === null) {
            node.style.removeProperty(key);
        }
        else {
            node.style.setProperty(key, value, important ? 'important' : '');
        }
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.46.6' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    const getUser = async () => await (await fetch('/api/user')).json();
    const getBlacklist = async () => await (await fetch('/api/blacklist')).json();
    const getGraylist = async () => await (await fetch('/api/graylist')).json();
    const getWhitelist = async () => await (await fetch('/api/whitelist')).json();
    const move = async (url, from, to) => await fetch('/api/move', {
        method: "POST",
        body: JSON.stringify({
            url,
            from,
            to
        }),
        headers: {
            "Content-Type": "application/json"
        }
    });

    /* website\src\App.svelte generated by Svelte v3.46.6 */

    const { console: console_1 } = globals;

    const file = "website\\src\\App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[13] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[13] = list[i];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[13] = list[i];
    	return child_ctx;
    }

    // (53:4) {:else}
    function create_else_block(ctx) {
    	let div;
    	let a;
    	let button;

    	const block = {
    		c: function create() {
    			div = element("div");
    			a = element("a");
    			button = element("button");
    			button.textContent = "Discord Login";
    			attr_dev(button, "class", "btn btn-primary");
    			attr_dev(button, "type", "button");
    			add_location(button, file, 55, 6, 1441);
    			attr_dev(a, "id", "loginDiscord");
    			attr_dev(a, "href", "/auth/discord");
    			add_location(a, file, 54, 5, 1391);
    			attr_dev(div, "class", "needtologin svelte-1en7fzk");
    			add_location(div, file, 53, 4, 1359);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, a);
    			append_dev(a, button);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(53:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (36:4) {#if user}
    function create_if_block_3(ctx) {
    	let div4;
    	let div3;
    	let div0;
    	let t0;
    	let div1;
    	let a0;
    	let t2;
    	let div2;
    	let a1;
    	let div3_style_value;
    	let t4;
    	let img;
    	let img_src_value;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			div3 = element("div");
    			div0 = element("div");
    			t0 = space();
    			div1 = element("div");
    			a0 = element("a");
    			a0.textContent = "Settings";
    			t2 = space();
    			div2 = element("div");
    			a1 = element("a");
    			a1.textContent = "Logout";
    			t4 = space();
    			img = element("img");
    			set_style(div0, "height", "70px");
    			set_style(div0, "width", "1px");
    			add_location(div0, file, 38, 6, 1013);
    			attr_dev(a0, "href", "/settings");
    			attr_dev(a0, "class", "svelte-1en7fzk");
    			add_location(a0, file, 40, 7, 1090);
    			attr_dev(div1, "class", "item svelte-1en7fzk");
    			add_location(div1, file, 39, 6, 1063);
    			attr_dev(a1, "href", "/logout");
    			attr_dev(a1, "class", "svelte-1en7fzk");
    			add_location(a1, file, 45, 7, 1190);
    			attr_dev(div2, "class", "item svelte-1en7fzk");
    			add_location(div2, file, 44, 6, 1163);
    			attr_dev(div3, "class", "usermenu svelte-1en7fzk");
    			attr_dev(div3, "style", div3_style_value = /*usermenu*/ ctx[4] ? "" : "display: none;");
    			add_location(div3, file, 37, 5, 940);
    			if (!src_url_equal(img.src, img_src_value = /*user*/ ctx[0].avatar)) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "id", "useravatar");
    			attr_dev(img, "alt", "avatar");
    			attr_dev(img, "class", "svelte-1en7fzk");
    			add_location(img, file, 50, 5, 1271);
    			attr_dev(div4, "id", "userinfo");
    			attr_dev(div4, "class", "svelte-1en7fzk");
    			add_location(div4, file, 36, 4, 888);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div3);
    			append_dev(div3, div0);
    			append_dev(div3, t0);
    			append_dev(div3, div1);
    			append_dev(div1, a0);
    			append_dev(div3, t2);
    			append_dev(div3, div2);
    			append_dev(div2, a1);
    			append_dev(div4, t4);
    			append_dev(div4, img);

    			if (!mounted) {
    				dispose = listen_dev(div4, "click", /*toggleUsermenu*/ ctx[5], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*usermenu*/ 16 && div3_style_value !== (div3_style_value = /*usermenu*/ ctx[4] ? "" : "display: none;")) {
    				attr_dev(div3, "style", div3_style_value);
    			}

    			if (dirty & /*user*/ 1 && !src_url_equal(img.src, img_src_value = /*user*/ ctx[0].avatar)) {
    				attr_dev(img, "src", img_src_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div4);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(36:4) {#if user}",
    		ctx
    	});

    	return block;
    }

    // (66:4) {#if whitelist}
    function create_if_block_2(ctx) {
    	let ul;
    	let each_value_2 = /*whitelist*/ ctx[3];
    	validate_each_argument(each_value_2);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	const block = {
    		c: function create() {
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(ul, "class", "svelte-1en7fzk");
    			add_location(ul, file, 66, 4, 1755);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, ul, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*whitelist*/ 8) {
    				each_value_2 = /*whitelist*/ ctx[3];
    				validate_each_argument(each_value_2);
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(ul, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_2.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(ul);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(66:4) {#if whitelist}",
    		ctx
    	});

    	return block;
    }

    // (68:5) {#each whitelist as url}
    function create_each_block_2(ctx) {
    	let li;
    	let t_value = /*url*/ ctx[13] + "";
    	let t;

    	const block = {
    		c: function create() {
    			li = element("li");
    			t = text(t_value);
    			attr_dev(li, "class", "svelte-1en7fzk");
    			add_location(li, file, 68, 5, 1797);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*whitelist*/ 8 && t_value !== (t_value = /*url*/ ctx[13] + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2.name,
    		type: "each",
    		source: "(68:5) {#each whitelist as url}",
    		ctx
    	});

    	return block;
    }

    // (77:4) {#if graylist}
    function create_if_block_1(ctx) {
    	let ul;
    	let each_value_1 = /*graylist*/ ctx[2];
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const block = {
    		c: function create() {
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(ul, "class", "svelte-1en7fzk");
    			add_location(ul, file, 77, 4, 2026);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, ul, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*moveToBlacklist, graylist, moveToWhitelist*/ 196) {
    				each_value_1 = /*graylist*/ ctx[2];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(ul, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_1.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(ul);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(77:4) {#if graylist}",
    		ctx
    	});

    	return block;
    }

    // (79:5) {#each graylist as url}
    function create_each_block_1(ctx) {
    	let li;
    	let button0;
    	let i0;
    	let t0;
    	let t1_value = /*url*/ ctx[13] + "";
    	let t1;
    	let t2;
    	let button1;
    	let i1;
    	let t3;
    	let mounted;
    	let dispose;

    	function click_handler_2() {
    		return /*click_handler_2*/ ctx[10](/*url*/ ctx[13]);
    	}

    	function click_handler_3() {
    		return /*click_handler_3*/ ctx[11](/*url*/ ctx[13]);
    	}

    	const block = {
    		c: function create() {
    			li = element("li");
    			button0 = element("button");
    			i0 = element("i");
    			t0 = space();
    			t1 = text(t1_value);
    			t2 = space();
    			button1 = element("button");
    			i1 = element("i");
    			t3 = space();
    			attr_dev(i0, "class", "bi bi-arrow-bar-left");
    			add_location(i0, file, 81, 7, 2184);
    			attr_dev(button0, "type", "button");
    			attr_dev(button0, "class", "btn btn-primary");
    			add_location(button0, file, 80, 6, 2079);
    			attr_dev(i1, "class", "bi bi-arrow-bar-right");
    			add_location(i1, file, 85, 7, 2375);
    			attr_dev(button1, "type", "button");
    			attr_dev(button1, "class", "btn btn-primary float-right svelte-1en7fzk");
    			add_location(button1, file, 84, 6, 2258);
    			attr_dev(li, "class", "svelte-1en7fzk");
    			add_location(li, file, 79, 5, 2067);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, button0);
    			append_dev(button0, i0);
    			append_dev(li, t0);
    			append_dev(li, t1);
    			append_dev(li, t2);
    			append_dev(li, button1);
    			append_dev(button1, i1);
    			append_dev(li, t3);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", click_handler_2, false, false, false),
    					listen_dev(button1, "click", click_handler_3, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*graylist*/ 4 && t1_value !== (t1_value = /*url*/ ctx[13] + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(79:5) {#each graylist as url}",
    		ctx
    	});

    	return block;
    }

    // (96:4) {#if blacklist}
    function create_if_block(ctx) {
    	let ul;
    	let each_value = /*blacklist*/ ctx[1];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(ul, "class", "svelte-1en7fzk");
    			add_location(ul, file, 96, 4, 2658);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, ul, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*blacklist*/ 2) {
    				each_value = /*blacklist*/ ctx[1];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(ul, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(ul);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(96:4) {#if blacklist}",
    		ctx
    	});

    	return block;
    }

    // (98:5) {#each blacklist as url}
    function create_each_block(ctx) {
    	let li;
    	let t_value = /*url*/ ctx[13] + "";
    	let t;

    	const block = {
    		c: function create() {
    			li = element("li");
    			t = text(t_value);
    			attr_dev(li, "class", "svelte-1en7fzk");
    			add_location(li, file, 98, 5, 2700);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*blacklist*/ 2 && t_value !== (t_value = /*url*/ ctx[13] + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(98:5) {#each blacklist as url}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let main;
    	let div7;
    	let div2;
    	let div0;
    	let h1;
    	let t1;
    	let div1;
    	let t2;
    	let div6;
    	let div3;
    	let h30;
    	let t4;
    	let button0;
    	let t6;
    	let t7;
    	let div4;
    	let h31;
    	let t9;
    	let button1;
    	let t11;
    	let t12;
    	let div5;
    	let h32;
    	let t14;
    	let button2;
    	let t16;
    	let mounted;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (/*user*/ ctx[0]) return create_if_block_3;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block0 = current_block_type(ctx);
    	let if_block1 = /*whitelist*/ ctx[3] && create_if_block_2(ctx);
    	let if_block2 = /*graylist*/ ctx[2] && create_if_block_1(ctx);
    	let if_block3 = /*blacklist*/ ctx[1] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			main = element("main");
    			div7 = element("div");
    			div2 = element("div");
    			div0 = element("div");
    			h1 = element("h1");
    			h1.textContent = "Discord Scam Terminator";
    			t1 = space();
    			div1 = element("div");
    			if_block0.c();
    			t2 = space();
    			div6 = element("div");
    			div3 = element("div");
    			h30 = element("h3");
    			h30.textContent = "Whitelist";
    			t4 = space();
    			button0 = element("button");
    			button0.textContent = "Load";
    			t6 = space();
    			if (if_block1) if_block1.c();
    			t7 = space();
    			div4 = element("div");
    			h31 = element("h3");
    			h31.textContent = "Graylist";
    			t9 = space();
    			button1 = element("button");
    			button1.textContent = "Reload";
    			t11 = space();
    			if (if_block2) if_block2.c();
    			t12 = space();
    			div5 = element("div");
    			h32 = element("h3");
    			h32.textContent = "Blacklist";
    			t14 = space();
    			button2 = element("button");
    			button2.textContent = "Load";
    			t16 = space();
    			if (if_block3) if_block3.c();
    			add_location(h1, file, 32, 4, 801);
    			attr_dev(div0, "class", "col svelte-1en7fzk");
    			add_location(div0, file, 31, 3, 778);
    			attr_dev(div1, "class", "col svelte-1en7fzk");
    			add_location(div1, file, 34, 3, 849);
    			attr_dev(div2, "class", "row");
    			add_location(div2, file, 30, 2, 756);
    			add_location(h30, file, 63, 4, 1613);
    			attr_dev(button0, "type", "button");
    			add_location(button0, file, 64, 4, 1637);
    			attr_dev(div3, "class", "col svelte-1en7fzk");
    			add_location(div3, file, 62, 3, 1590);
    			add_location(h31, file, 74, 4, 1886);
    			attr_dev(button1, "type", "button");
    			add_location(button1, file, 75, 4, 1909);
    			attr_dev(div4, "class", "col svelte-1en7fzk");
    			add_location(div4, file, 73, 3, 1863);
    			add_location(h32, file, 93, 4, 2516);
    			attr_dev(button2, "type", "button");
    			add_location(button2, file, 94, 4, 2540);
    			attr_dev(div5, "class", "col svelte-1en7fzk");
    			add_location(div5, file, 92, 3, 2493);
    			attr_dev(div6, "class", "row");
    			add_location(div6, file, 61, 2, 1568);
    			attr_dev(div7, "class", "container svelte-1en7fzk");
    			add_location(div7, file, 29, 1, 729);
    			add_location(main, file, 28, 0, 720);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div7);
    			append_dev(div7, div2);
    			append_dev(div2, div0);
    			append_dev(div0, h1);
    			append_dev(div2, t1);
    			append_dev(div2, div1);
    			if_block0.m(div1, null);
    			append_dev(div7, t2);
    			append_dev(div7, div6);
    			append_dev(div6, div3);
    			append_dev(div3, h30);
    			append_dev(div3, t4);
    			append_dev(div3, button0);
    			append_dev(div3, t6);
    			if (if_block1) if_block1.m(div3, null);
    			append_dev(div6, t7);
    			append_dev(div6, div4);
    			append_dev(div4, h31);
    			append_dev(div4, t9);
    			append_dev(div4, button1);
    			append_dev(div4, t11);
    			if (if_block2) if_block2.m(div4, null);
    			append_dev(div6, t12);
    			append_dev(div6, div5);
    			append_dev(div5, h32);
    			append_dev(div5, t14);
    			append_dev(div5, button2);
    			append_dev(div5, t16);
    			if (if_block3) if_block3.m(div5, null);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*click_handler*/ ctx[8], false, false, false),
    					listen_dev(button1, "click", /*click_handler_1*/ ctx[9], false, false, false),
    					listen_dev(button2, "click", /*click_handler_4*/ ctx[12], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block0) {
    				if_block0.p(ctx, dirty);
    			} else {
    				if_block0.d(1);
    				if_block0 = current_block_type(ctx);

    				if (if_block0) {
    					if_block0.c();
    					if_block0.m(div1, null);
    				}
    			}

    			if (/*whitelist*/ ctx[3]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_2(ctx);
    					if_block1.c();
    					if_block1.m(div3, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (/*graylist*/ ctx[2]) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    				} else {
    					if_block2 = create_if_block_1(ctx);
    					if_block2.c();
    					if_block2.m(div4, null);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}

    			if (/*blacklist*/ ctx[1]) {
    				if (if_block3) {
    					if_block3.p(ctx, dirty);
    				} else {
    					if_block3 = create_if_block(ctx);
    					if_block3.c();
    					if_block3.m(div5, null);
    				}
    			} else if (if_block3) {
    				if_block3.d(1);
    				if_block3 = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    			if (if_block3) if_block3.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let user;
    	let blacklist, graylist, whitelist;

    	onMount(async () => {
    		$$invalidate(0, user = await getUser());
    		$$invalidate(2, graylist = await getGraylist());
    	});

    	let usermenu = false;
    	const toggleUsermenu = () => $$invalidate(4, usermenu = !usermenu);

    	const moveToWhitelist = async url => {
    		await move(url, "graylist", "whitelist");
    		graylist.splice(graylist.indexOf(url), 1);
    		console.dir(graylist);
    	};

    	const moveToBlacklist = async url => {
    		await move(url, "graylist", "blacklist");
    		graylist.splice(graylist.indexOf(url), 1);
    		console.dir(graylist);
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	const click_handler = async () => $$invalidate(3, whitelist = await getWhitelist());
    	const click_handler_1 = async () => $$invalidate(2, graylist = await getGraylist());
    	const click_handler_2 = async url => await moveToWhitelist(url);
    	const click_handler_3 = async url => await moveToBlacklist(url);
    	const click_handler_4 = async () => $$invalidate(1, blacklist = await getBlacklist());

    	$$self.$capture_state = () => ({
    		onMount,
    		getUser,
    		getBlacklist,
    		getGraylist,
    		getWhitelist,
    		move,
    		user,
    		blacklist,
    		graylist,
    		whitelist,
    		usermenu,
    		toggleUsermenu,
    		moveToWhitelist,
    		moveToBlacklist
    	});

    	$$self.$inject_state = $$props => {
    		if ('user' in $$props) $$invalidate(0, user = $$props.user);
    		if ('blacklist' in $$props) $$invalidate(1, blacklist = $$props.blacklist);
    		if ('graylist' in $$props) $$invalidate(2, graylist = $$props.graylist);
    		if ('whitelist' in $$props) $$invalidate(3, whitelist = $$props.whitelist);
    		if ('usermenu' in $$props) $$invalidate(4, usermenu = $$props.usermenu);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		user,
    		blacklist,
    		graylist,
    		whitelist,
    		usermenu,
    		toggleUsermenu,
    		moveToWhitelist,
    		moveToBlacklist,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		click_handler_3,
    		click_handler_4
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: { }
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
