document.addEventListener('DOMContentLoaded', () => {
    const btnLogin = document.getElementById('botaoLogin');
    const btnCadastro = document.getElementById('botaoCadastro');
    const btnLogout = document.getElementById('botaoLogout');
    const btnCarrinho = document.getElementById('botaoCarrinho');
    const btnAdicionarProduto = document.getElementById('botaoAdicionarProduto');

    // load users from localStorage
    const storageKey = 'usuarios';
    function loadUsers() {
        try { return JSON.parse(localStorage.getItem(storageKey) || '{}'); }
        catch { return {}; }
    }
    function saveUsers(u) { localStorage.setItem(storageKey, JSON.stringify(u)); }

    function getCurrentUser() {
        return localStorage.getItem('currentUser') || null;
    }
    function setCurrentUser(email) {
        if (email) localStorage.setItem('currentUser', email);
        else localStorage.removeItem('currentUser');
    }

    // cart per-user storage key
    function cartKeyFor(email) {
        return 'carrinho_' + (email || 'anon');
    }
    function loadCartFor(email) {
        try { return JSON.parse(localStorage.getItem(cartKeyFor(email)) || '[]'); }
        catch { return []; }
    }
    function saveCartFor(email, cart) {
        localStorage.setItem(cartKeyFor(email), JSON.stringify(cart));
    }

    // helper: toggle visibility using CSS hide classes (ghost / ghostOposto)
    function applyVisibility(el, shouldShow, hideClass) {
        if (!el) return;
        if (shouldShow) {
            el.classList.remove(hideClass);
            el.disabled = false;
            el.setAttribute('aria-hidden', 'false');
            el.style.pointerEvents = '';
            el.style.opacity = '';
            el.tabIndex = 0;
        } else {
            el.classList.add(hideClass);
            el.disabled = true;
            el.setAttribute('aria-hidden', 'true');
            el.style.pointerEvents = 'none';
            el.style.opacity = '0';
            el.tabIndex = -1;
        }
    }

    function updateAuthUI() {
        const loggedIn = !!getCurrentUser();

        applyVisibility(btnCarrinho, loggedIn, 'ghostOposto');
        applyVisibility(btnAdicionarProduto, loggedIn, 'ghostOposto');
        applyVisibility(btnLogout, loggedIn, 'ghost');
        applyVisibility(btnLogin, !loggedIn, 'ghost');
        applyVisibility(btnCadastro, !loggedIn, 'ghost');
    }

    // generic modal creator (used for login/register/add product)
    function showModal({ title = '', fields = [], submitText = 'OK', validate = () => ({ ok: true, msg: '' }) }, onSubmit) {
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.inset = '0';
        overlay.style.background = 'rgba(0,0,0,0.5)';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.zIndex = '9999';

        const dlg = document.createElement('div');
        dlg.style.background = '#fff';
        dlg.style.padding = '18px';
        dlg.style.borderRadius = '6px';
        dlg.style.width = 'min(520px, 96%)';
        dlg.style.boxSizing = 'border-box';
        dlg.style.boxShadow = '0 6px 18px rgba(0,0,0,0.25)';
        overlay.appendChild(dlg);

        const h = document.createElement('h3');
        h.textContent = title;
        h.style.marginTop = '0';
        dlg.appendChild(h);

        const form = document.createElement('form');
        form.style.display = 'grid';
        form.style.gap = '8px';
        dlg.appendChild(form);

        const inputs = {};
        fields.forEach(f => {
            const label = document.createElement('label');
            label.style.display = 'flex';
            label.style.flexDirection = 'column';
            label.style.fontSize = '0.95rem';
            label.textContent = f.label;
            const input = document.createElement(f.type === 'textarea' ? 'textarea' : 'input');
            input.type = f.inputType || 'text';
            input.placeholder = f.placeholder || '';
            input.value = f.value || '';
            input.required = !!f.required;
            input.autocomplete = f.autocomplete || 'off';
            input.style.padding = '8px';
            input.style.border = '1px solid #ccc';
            input.style.borderRadius = '4px';
            label.appendChild(input);
            form.appendChild(label);
            inputs[f.name] = input;
        });

        const msg = document.createElement('div');
        msg.style.minHeight = '18px';
        msg.style.color = 'crimson';
        msg.style.fontSize = '0.9rem';
        form.appendChild(msg);

        const controls = document.createElement('div');
        controls.style.display = 'flex';
        controls.style.gap = '8px';
        controls.style.justifyContent = 'flex-end';
        form.appendChild(controls);

        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.textContent = 'Cancelar';
        cancelBtn.style.padding = '8px 12px';
        cancelBtn.addEventListener('click', close);
        controls.appendChild(cancelBtn);

        const submitBtn = document.createElement('button');
        submitBtn.type = 'submit';
        submitBtn.textContent = submitText;
        submitBtn.style.padding = '8px 12px';
        submitBtn.style.background = '#0000AA';
        submitBtn.style.color = '#fff';
        submitBtn.style.border = 'none';
        submitBtn.style.borderRadius = '4px';
        controls.appendChild(submitBtn);

        submitBtn.addEventListener('click', () => { if (typeof form.requestSubmit === 'function') form.requestSubmit(); });

        function close() {
            document.body.removeChild(overlay);
            document.removeEventListener('keydown', onKey);
        }
        function onKey(e) { if (e.key === 'Escape') close(); }
        document.addEventListener('keydown', onKey);

        overlay.addEventListener('click', (ev) => { if (ev.target === overlay) close(); });

        form.addEventListener('submit', (ev) => {
            ev.preventDefault();
            const values = {};
            Object.keys(inputs).forEach(k => values[k] = inputs[k].value.trim());
            const v = validate(values);
            if (!v.ok) {
                msg.textContent = v.msg || 'Erro de validação';
                return;
            }
            onSubmit(values, close, msg);
        });

        document.body.appendChild(overlay);
        if (fields.length) inputs[fields[0].name]?.focus();
    }

    // register flow
    function openCadastro() {
        showModal({
            title: 'Cadastro',
            fields: [
                { name: 'nome', label: 'Nome', required: true, placeholder: 'Seu nome' },
                { name: 'email', label: 'Email', required: true, placeholder: 'email@exemplo.com' },
                { name: 'senha', label: 'Senha', required: true, inputType: 'password', placeholder: 'Senha' }
            ],
            submitText: 'Cadastrar',
            validate: (vals) => {
                if (!vals.nome) return { ok: false, msg: 'Informe o nome.' };
                if (!vals.email || !vals.email.includes('@') || !vals.email.includes('.com')) return { ok: false, msg: 'Email inválido (deve conter "@" e ".com").' };
                if (!vals.senha) return { ok: false, msg: 'Senha inválida.' };
                const users = loadUsers();
                if (users[vals.email]) return { ok: false, msg: 'Email já cadastrado.' };
                return { ok: true };
            }
        }, (vals, close) => {
            const users = loadUsers();
            users[vals.email] = { nome: vals.nome, senha: vals.senha };
            saveUsers(users);
            setCurrentUser(vals.email);
            updateAuthUI();
            close();
        });
    }

    // login flow
    function openLogin() {
        showModal({
            title: 'Login',
            fields: [
                { name: 'email', label: 'Email', required: true, placeholder: 'email@exemplo.com' },
                { name: 'senha', label: 'Senha', required: true, inputType: 'password', placeholder: 'Senha' }
            ],
            submitText: 'Entrar',
            validate: (vals) => {
                if (!vals.email || !vals.senha) return { ok: false, msg: 'Informe email e senha.' };
                const users = loadUsers();
                if (!users[vals.email]) return { ok: false, msg: 'Conta não encontrada.' };
                if (users[vals.email].senha !== vals.senha) return { ok: false, msg: 'Senha incorreta.' };
                return { ok: true };
            }
        }, (vals, close) => {
            setCurrentUser(vals.email);
            updateAuthUI();
            close();
        });
    }

    /* replace/insert these functions into the file (they depend on other helpers present) */

    function restoreStockFor(prodName, amount) {
        const cards = document.querySelectorAll('div.produto');
        cards.forEach(card => {
            const nameEl = card.querySelector('.produtoNome');
            const stockEl = card.querySelector('.produtoEstoque');
            const addBtn = card.querySelector('.produtoBotaoAdicionar');
            if (!nameEl || !stockEl || !addBtn) return;
            if (nameEl.textContent.trim() === prodName) {
                const current = parseInt((stockEl.textContent.match(/\d+/) || ['0'])[0], 10);
                const next = current + Number(amount);
                stockEl.textContent = `${next} em estoque`;
                if (next > 0) {
                    addBtn.disabled = false;
                    addBtn.style.opacity = '';
                    addBtn.textContent = addBtn.dataset.defaultLabel || addBtn.textContent;
                }
            }
        });
    }

    // ensure product cards have owner controls updated after auth changes
    function updateProductOwnerControls() {
        const currentEmail = getCurrentUser();
        const users = loadUsers();
        const currentName = currentEmail && users[currentEmail] ? users[currentEmail].nome : null;

        document.querySelectorAll('div.produto').forEach(card => {
            // ensure there is a "Mudar estoque" button (create if missing)
            let changeBtn = card.querySelector('.produtoBotaoMudarEstoque');
            if (!changeBtn) {
                changeBtn = document.createElement('button');
                changeBtn.className = 'produtoBotaoMudarEstoque';
                changeBtn.textContent = 'Mudar estoque';
                changeBtn.style.marginLeft = '8px';
                // append to product buttons row if exists, otherwise create row
                const row = card.querySelector('.produtoBotoes') || (() => {
                    const d = document.createElement('div');
                    d.className = 'produtoBotoes';
                    card.appendChild(d);
                    return d;
                })();
                row.appendChild(changeBtn);
            }

            const sellerEl = card.querySelector('.produtoVendedor');
            const isOwner = sellerEl && currentName && sellerEl.textContent.trim() === currentName;

            // show only to owner
            changeBtn.style.display = isOwner ? '' : 'none';
            changeBtn.disabled = !isOwner;

            // bind handler once
            if (!changeBtn.dataset.bound) {
                changeBtn.dataset.bound = '1';
                changeBtn.addEventListener('click', () => {
                    showModal({
                        title: 'Alterar estoque',
                        fields: [
                            { name: 'novo', label: 'Novo estoque (inteiro)', required: true, inputType: 'number', placeholder: 'Ex: 5' }
                        ],
                        submitText: 'Salvar',
                        validate: (vals) => {
                            const n = parseInt(vals.novo, 10);
                            if (isNaN(n) || n < 0) return { ok: false, msg: 'Estoque inválido.' };
                            return { ok: true };
                        }
                    }, (vals, close) => {
                        const stockEl = card.querySelector('.produtoEstoque');
                        const addBtn = card.querySelector('.produtoBotaoAdicionar');
                        const n = parseInt(vals.novo, 10);
                        if (stockEl) stockEl.textContent = `${n} em estoque`;
                        if (addBtn) {
                            if (n <= 0) {
                                addBtn.disabled = true;
                                addBtn.style.opacity = '0.5';
                                addBtn.textContent = 'Sem estoque';
                            } else {
                                addBtn.disabled = false;
                                addBtn.style.opacity = '';
                                addBtn.textContent = addBtn.dataset.defaultLabel || 'Adicionar ao Carrinho';
                            }
                        }
                        close();
                    });
                });
            }
        });
    }

    // attach handlers to a product card (updated: buy, add, owner controls)
    function attachProductHandlers(card) {
        if (!card) return;
        const addBtn = card.querySelector('.produtoBotaoAdicionar');
        const buyBtn = card.querySelector('.produtoBotaoComprar');
        const stockEl = card.querySelector('.produtoEstoque');
        const nameEl = card.querySelector('.produtoNome');
        const priceEl = card.querySelector('.produtoPreco');
        const imgEl = card.querySelector('.produtoImagem');
        const sellerEl = card.querySelector('.produtoVendedor');

        // ensure add button exists
        if (addBtn && !addBtn.dataset.bound) {
            addBtn.dataset.bound = '1';
            addBtn.dataset.defaultLabel = addBtn.textContent;
            addBtn.addEventListener('click', () => {
                const currentUser = getCurrentUser();
                if (!currentUser) {
                    alert('Você precisa estar logado para adicionar ao carrinho.');
                    return;
                }
                const stockMatch = stockEl ? stockEl.textContent.match(/\d+/) : null;
                let stock = stockMatch ? parseInt(stockMatch[0], 10) : Infinity;
                if (isNaN(stock) || stock <= 0) {
                    alert('Sem estoque disponível.');
                    addBtn.disabled = true;
                    addBtn.style.opacity = '0.5';
                    addBtn.textContent = 'Sem estoque';
                    return;
                }

                const cart = loadCartFor(currentUser);
                const priceNumber = parseFloat((priceEl ? priceEl.textContent.replace(/[^\d,\.]/g,'').replace(',','.') : '0').replace(',', '.'));
                const existing = cart.find(i => i.nome === (nameEl ? nameEl.textContent : ''));
                if (existing) {
                    existing.quantidade++;
                } else {
                    cart.push({
                        nome: nameEl ? nameEl.textContent : 'Produto',
                        preco: priceNumber || 0,
                        imagem: imgEl ? imgEl.src : '',
                        vendedor: sellerEl ? sellerEl.textContent : '',
                        quantidade: 1
                    });
                }
                saveCartFor(currentUser, cart);

                // decrement stock visually
                if (stockEl) {
                    const next = stock - 1;
                    stockEl.textContent = `${next} em estoque`;
                    if (next <= 0) {
                        addBtn.disabled = true;
                        addBtn.style.opacity = '0.5';
                        addBtn.textContent = 'Sem estoque';
                    }
                }
            });
        }

        // buy button: simulate immediate purchase, decrement stock and optionally show confirmation
        if (buyBtn && !buyBtn.dataset.bound) {
            buyBtn.dataset.bound = '1';
            buyBtn.addEventListener('click', () => {
                // confirm purchase
                const q = confirm('Simular compra deste item agora?');
                if (!q) return;

                const stockMatch = stockEl ? stockEl.textContent.match(/\d+/) : null;
                let stock = stockMatch ? parseInt(stockMatch[0], 10) : Infinity;
                if (isNaN(stock) || stock <= 0) {
                    alert('Sem estoque disponível.');
                    if (addBtn) {
                        addBtn.disabled = true;
                        addBtn.style.opacity = '0.5';
                        addBtn.textContent = 'Sem estoque';
                    }
                    return;
                }
                // decrement one unit and mark purchase successful
                const next = stock - 1;
                if (stockEl) stockEl.textContent = `${next} em estoque`;
                alert('Compra simulada concluída.');

                if (next <= 0 && addBtn) {
                    addBtn.disabled = true;
                    addBtn.style.opacity = '0.5';
                    addBtn.textContent = 'Sem estoque';
                }
            });
        }

        // ensure disabled state if stock is zero at load
        if (stockEl && addBtn) {
            const stockNum = parseInt((stockEl.textContent.match(/\d+/) || ['0'])[0], 10);
            if (isNaN(stockNum) || stockNum <= 0) {
                addBtn.disabled = true;
                addBtn.style.opacity = '0.5';
                addBtn.textContent = 'Sem estoque';
            } else {
                addBtn.disabled = false;
                addBtn.style.opacity = '';
            }
        }

        // update owner controls visibility now
        updateProductOwnerControls();
    }

    // extended cart modal: allow "Comprar tudo" (simulate purchase) and per-item stock check
    function openCarrinhoModal() {
        const current = getCurrentUser();
        const cart = loadCartFor(current) || [];

        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.inset = '0';
        overlay.style.background = 'rgba(0,0,0,0.5)';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.zIndex = '9999';

        const dlg = document.createElement('div');
        dlg.style.background = '#fff';
        dlg.style.padding = '18px';
        dlg.style.borderRadius = '6px';
        dlg.style.width = 'min(720px, 96%)';
        dlg.style.maxHeight = '80vh';
        dlg.style.overflow = 'auto';
        overlay.appendChild(dlg);

        const h = document.createElement('h3');
        h.textContent = 'Carrinho';
        dlg.appendChild(h);

        const list = document.createElement('div');
        list.style.display = 'grid';
        list.style.gap = '12px';
        dlg.appendChild(list);

        function renderList() {
            list.innerHTML = '';
            if (!cart.length) {
                const empty = document.createElement('div');
                empty.textContent = 'Carrinho vazio.';
                list.appendChild(empty);
                return;
            }
            cart.forEach((item, idx) => {
                const row = document.createElement('div');
                row.style.display = 'flex';
                row.style.gap = '8px';
                row.style.alignItems = 'center';

                const img = document.createElement('img');
                img.src = item.imagem;
                img.style.width = '64px';
                img.style.height = '64px';
                img.style.objectFit = 'cover';
                row.appendChild(img);

                const info = document.createElement('div');
                info.style.flex = '1';
                info.innerHTML = `<strong>${item.nome}</strong><div>${item.vendedor}</div><div>${formatR$(item.preco)}</div>`;
                row.appendChild(info);

                const qty = document.createElement('div');
                qty.textContent = 'x' + item.quantidade;
                row.appendChild(qty);

                const remove = document.createElement('button');
                remove.textContent = 'Remover';
                remove.addEventListener('click', () => {
                    if (item.quantidade > 1) {
                        item.quantidade--;
                    } else {
                        cart.splice(idx, 1);
                    }
                    saveCartFor(current, cart);
                    restoreStockFor(item.nome, 1);
                    renderList();
                });
                row.appendChild(remove);

                list.appendChild(row);
            });
        }

        renderList();

        const controls = document.createElement('div');
        controls.style.display = 'flex';
        controls.style.gap = '8px';
        controls.style.justifyContent = 'flex-end';
        controls.style.marginTop = '12px';
        dlg.appendChild(controls);

        const buyAllBtn = document.createElement('button');
        buyAllBtn.textContent = 'Comprar tudo (simular)';
        buyAllBtn.addEventListener('click', () => {
            if (!cart.length) { alert('Carrinho vazio.'); return; }
            // attempt purchase for each item: check DOM stock and decrement if available
            const failed = [];
            cart.forEach(it => {
                // find product card by name
                const card = Array.from(document.querySelectorAll('div.produto')).find(c => {
                    const n = c.querySelector('.produtoNome');
                    return n && n.textContent.trim() === it.nome;
                });
                if (!card) {
                    failed.push({ nome: it.nome, motivo: 'Produto não encontrado' });
                    return;
                }
                const stockEl = card.querySelector('.produtoEstoque');
                const addBtn = card.querySelector('.produtoBotaoAdicionar');
                const stockNum = parseInt((stockEl ? (stockEl.textContent.match(/\d+/) || ['0'])[0] : '0'), 10);
                if (isNaN(stockNum) || stockNum < it.quantidade) {
                    failed.push({ nome: it.nome, motivo: `Estoque insuficiente (${stockNum} disponível)` });
                    return;
                }
                // enough stock: decrement
                const next = stockNum - it.quantidade;
                if (stockEl) stockEl.textContent = `${next} em estoque`;
                if (addBtn) {
                    if (next <= 0) {
                        addBtn.disabled = true;
                        addBtn.style.opacity = '0.5';
                        addBtn.textContent = 'Sem estoque';
                    }
                }
            });

            if (failed.length) {
                const msgs = failed.map(f => `${f.nome}: ${f.motivo}`).join('\n');
                alert('Alguns itens não puderam ser comprados:\n' + msgs);
                // remove only the successfully purchased items from cart
                const still = [];
                cart.forEach(it => {
                    const card = Array.from(document.querySelectorAll('div.produto')).find(c => {
                        const n = c.querySelector('.produtoNome');
                        return n && n.textContent.trim() === it.nome;
                    });
                    const stockEl = card ? card.querySelector('.produtoEstoque') : null;
                    const stockNum = stockEl ? parseInt((stockEl.textContent.match(/\d+/) || ['0'])[0], 10) : 0;
                    // if stockNum < it.quantidade then this item failed and should stay
                    if (isNaN(stockNum) || stockNum < 0) {
                        still.push(it); // keep
                    } else {
                        // If stockNum >=0 we consider it purchased already (we updated DOM above)
                        // if there was a failure earlier this item will remain because we didn't decrement
                    }
                });
                // clear cart and re-add remaining (simpler: just recalc from DOM - for now, empty cart and save)
                // simplest: clear cart completely if any failure would complicate; notify user to re-add remaining
                saveCartFor(current, []);
                alert('Compra parcial realizada. Carrinho limpo; itens não comprados devem ser adicionados novamente.');
            } else {
                // all purchased
                saveCartFor(current, []);
                alert('Compra simulada de todos os itens realizada com sucesso.');
            }

            renderList();
            updateProductOwnerControls();
        });
        controls.appendChild(buyAllBtn);

        const clearBtn = document.createElement('button');
        clearBtn.textContent = 'Esvaziar';
        clearBtn.addEventListener('click', () => {
            cart.forEach(it => restoreStockFor(it.nome, it.quantidade));
            cart.length = 0;
            saveCartFor(current, cart);
            renderList();
        });
        controls.appendChild(clearBtn);

        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Fechar';
        closeBtn.addEventListener('click', () => document.body.removeChild(overlay));
        controls.appendChild(closeBtn);

        document.body.appendChild(overlay);
    }

    function formatR$(num) {
        return 'R$ ' + Number(num).toFixed(2).replace('.', ',');
    }

    // attach handlers to a product card
    function attachProductHandlers(card) {
        if (!card) return;
        const addBtn = card.querySelector('.produtoBotaoAdicionar');
        const buyBtn = card.querySelector('.produtoBotaoComprar');
        const stockEl = card.querySelector('.produtoEstoque');
        const nameEl = card.querySelector('.produtoNome');
        const priceEl = card.querySelector('.produtoPreco');
        const imgEl = card.querySelector('.produtoImagem');
        const sellerEl = card.querySelector('.produtoVendedor');

        if (addBtn && !addBtn.dataset.bound) {
            addBtn.dataset.bound = '1';
            // store default label
            addBtn.dataset.defaultLabel = addBtn.textContent;
            addBtn.addEventListener('click', () => {
                const currentUser = getCurrentUser();
                if (!currentUser) {
                    alert('Você precisa estar logado para adicionar ao carrinho.');
                    return;
                }
                // read stock
                const stockMatch = stockEl ? stockEl.textContent.match(/\d+/) : null;
                let stock = stockMatch ? parseInt(stockMatch[0], 10) : Infinity;
                if (isNaN(stock) || stock <= 0) {
                    alert('Sem estoque disponível.');
                    addBtn.disabled = true;
                    addBtn.style.opacity = '0.5';
                    addBtn.textContent = 'Sem estoque';
                    return;
                }

                // add to user cart
                const cart = loadCartFor(currentUser);
                const priceNumber = parseFloat((priceEl ? priceEl.textContent.replace(/[^\d,\.]/g,'').replace(',','.') : '0').replace(',', '.'));
                const existing = cart.find(i => i.nome === (nameEl ? nameEl.textContent : ''));
                if (existing) {
                    existing.quantidade++;
                } else {
                    cart.push({
                        nome: nameEl ? nameEl.textContent : 'Produto',
                        preco: priceNumber || 0,
                        imagem: imgEl ? imgEl.src : '',
                        vendedor: sellerEl ? sellerEl.textContent : '',
                        quantidade: 1
                    });
                }
                saveCartFor(currentUser, cart);

                // decrement stock visually
                if (stockEl) {
                    const next = stock - 1;
                    stockEl.textContent = `${next} em estoque`;
                    if (next <= 0) {
                        addBtn.disabled = true;
                        addBtn.style.opacity = '0.5';
                        addBtn.textContent = 'Sem estoque';
                    }
                }
            });
        }

        if (buyBtn && !buyBtn.dataset.bound) {
            buyBtn.dataset.bound = '1';
            buyBtn.addEventListener('click', () => {
                alert('Compra simulada — implementar fluxo real conforme necessário.');
            });
        }

        // ensure disabled state if stock is zero at load
        if (stockEl && addBtn) {
            const stockNum = parseInt((stockEl.textContent.match(/\d+/) || ['0'])[0], 10);
            if (isNaN(stockNum) || stockNum <= 0) {
                addBtn.disabled = true;
                addBtn.style.opacity = '0.5';
                addBtn.textContent = 'Sem estoque';
            } else {
                addBtn.disabled = false;
                addBtn.style.opacity = '';
            }
        }
    }

    // add product flow (with stock)
    function openAdicionarProduto() {
        const currentEmail = getCurrentUser();
        if (!currentEmail) {
            alert('Você precisa estar logado para adicionar produtos.');
            return;
        }
        const users = loadUsers();
        const vendedorNome = (users[currentEmail] && users[currentEmail].nome) || 'Usuário';

        showModal({
            title: 'Adicionar Produto',
            fields: [
                { name: 'imagem', label: 'URL da imagem', required: true, placeholder: 'https://...' },
                { name: 'nome', label: 'Nome do produto', required: true, placeholder: 'Ex: Caneca' },
                { name: 'preco', label: 'Preço (Ex: 10.99)', required: true, placeholder: 'Ex: 10.99' },
                { name: 'estoque', label: 'Estoque (número inteiro)', required: true, placeholder: 'Ex: 5', inputType: 'number' }
            ],
            submitText: 'Adicionar',
            validate: (vals) => {
                if (!vals.imagem) return { ok: false, msg: 'Informe a URL da imagem.' };
                if (!/^https?:\/\//i.test(vals.imagem)) return { ok: false, msg: 'URL da imagem deve começar com http:// ou https://.' };
                if (!vals.nome) return { ok: false, msg: 'Informe o nome do produto.' };
                if (!vals.preco) return { ok: false, msg: 'Informe o preço do produto.' };
                const normalized = vals.preco.replace(',', '.').replace(/[^\d.]/g, '');
                if (!normalized || isNaN(Number(normalized))) return { ok: false, msg: 'Preço inválido.' };
                const estoqueNum = parseInt(vals.estoque, 10);
                if (isNaN(estoqueNum) || estoqueNum < 0) return { ok: false, msg: 'Estoque inválido.' };
                return { ok: true };
            }
        }, (vals, close) => {
            const section = document.querySelector('section.produtos');
            if (!section) {
                close();
                return;
            }

            const precoNumber = Number(vals.preco.replace(',', '.').replace(/[^\d.]/g, ''));
            const formattedPrice = 'R$ ' + precoNumber.toFixed(2).replace('.', ',');

            const card = document.createElement('div');
            card.className = 'produto';
            card.style.boxSizing = 'border-box';

            const img = document.createElement('img');
            img.className = 'produtoImagem';
            img.src = vals.imagem;
            img.width = 100;
            img.height = 100;
            img.alt = vals.nome;
            img.style.objectFit = 'contain';
            img.style.maxWidth = '100%';

            const h2 = document.createElement('h2');
            h2.className = 'produtoNome';
            h2.textContent = vals.nome;

            const pPreco = document.createElement('p');
            pPreco.className = 'produtoPreco';
            pPreco.textContent = formattedPrice;

            const pVendedor = document.createElement('p');
            pVendedor.className = 'produtoVendedor';
            pVendedor.textContent = vendedorNome;

            const pEstoque = document.createElement('p');
            pEstoque.className = 'produtoEstoque';
            pEstoque.textContent = `${parseInt(vals.estoque, 10)} em estoque`;

            const botoesDiv = document.createElement('div');
            botoesDiv.className = 'produtoBotoes';

            const botAdicionar = document.createElement('button');
            botAdicionar.className = 'produtoBotaoAdicionar';
            botAdicionar.textContent = 'Adicionar ao Carrinho';

            const botComprar = document.createElement('button');
            botComprar.className = 'produtoBotaoComprar';
            botComprar.textContent = 'Comprar';

            botoesDiv.appendChild(botAdicionar);
            botoesDiv.appendChild(botComprar);

            card.appendChild(img);
            card.appendChild(h2);
            card.appendChild(pPreco);
            card.appendChild(pVendedor);
            card.appendChild(pEstoque);
            card.appendChild(botoesDiv);

            section.appendChild(card);

            // attach interactivity
            attachProductHandlers(card);

            close();
        });
    }

    if (btnCadastro) btnCadastro.addEventListener('click', openCadastro);
    if (btnLogin) btnLogin.addEventListener('click', openLogin);
    if (btnLogout) btnLogout.addEventListener('click', () => {
        setCurrentUser(null);
        updateAuthUI();
    });
    if (btnAdicionarProduto) btnAdicionarProduto.addEventListener('click', openAdicionarProduto);
    if (btnCarrinho) btnCarrinho.addEventListener('click', openCarrinhoModal);

    // attach handlers to existing products in the DOM
    document.querySelectorAll('div.produto').forEach(attachProductHandlers);

    // initialize UI
    updateAuthUI();
});