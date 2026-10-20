(() => {
  'use strict';

  const CHAVE_USUARIOS = 'rol.usuarios.v1';
  const obter = (id) => document.getElementById(id);
  const formulario = obter('cadastro-form');
  const campos = { nome: obter('nome'), email: obter('email'), senha: obter('senha') };
  const botao = obter('botao-cadastrar');
  const alternarSenha = obter('alternar-senha');
  const painel = obter('painel-registros');
  const sucesso = obter('sucesso');
  const dataCurta = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  let usuarios = [];
  let enviando = false;
  let concluido = false;

  const normalizarEmail = (email) => email.trim().toLowerCase();

  function validarEmail(email) {
    if (!email.trim()) return 'Informe seu e-mail.';
    return /^[^\s@]+@(?:[a-z\d](?:[a-z\d-]*[a-z\d])?\.)+[a-z]{2,}$/i.test(email.trim())
      ? '' : 'Use um e-mail como nome@dominio.com.';
  }

  function validarSenha(senha) {
    if (!senha.trim()) return 'Informe uma senha.';
    return [...senha].length >= 8 ? '' : 'Use pelo menos 8 caracteres.';
  }

  function erroDeCadastro(mensagem, campo = '') {
    return Object.assign(new Error(mensagem), { campo });
  }

  // Valida e seleciona somente os dados conhecidos antes de reutilizar o armazenamento.
  function lerUsuarios() {
    let registros;
    try {
      registros = JSON.parse(localStorage.getItem(CHAVE_USUARIOS) || '[]');
    } catch (erro) {
      throw erroDeCadastro(erro.name === 'SecurityError'
        ? 'Permita o armazenamento neste navegador para continuar.'
        : 'Não foi possível ler os registros salvos neste navegador.');
    }
    if (!Array.isArray(registros) || registros.some((item) => !item ||
      typeof item.id !== 'string' || !item.id || typeof item.nome !== 'string' || !item.nome.trim() ||
      typeof item.email !== 'string' || validarEmail(item.email) ||
      typeof item.senhaHash !== 'string' || !/^[a-f\d]{64}$/i.test(item.senhaHash) ||
      typeof item.criadoEm !== 'string' || !Number.isFinite(Date.parse(item.criadoEm)))) {
      throw erroDeCadastro('Os registros locais têm dados inválidos. Confira o armazenamento deste navegador.');
    }
    return registros.map(({ id, nome, email, senhaHash, criadoEm }) => ({
      id, nome, email: normalizarEmail(email), senhaHash, criadoEm
    }));
  }

  function mostrarErro(campo, mensagem) {
    obter(`erro-${campo}`).textContent = mensagem;
    campos[campo].setAttribute('aria-invalid', String(Boolean(mensagem)));
    const grupo = document.querySelector(`[data-campo="${campo}"]`);
    grupo.classList.toggle('com-erro', Boolean(mensagem));
    grupo.classList.toggle('valido', !mensagem && Boolean(campos[campo].value.trim()));
  }

  function validarCampo(campo) {
    let mensagem = '';
    if (campo === 'nome' && !campos.nome.value.trim()) mensagem = 'Informe seu nome.';
    if (campo === 'senha') mensagem = validarSenha(campos.senha.value);
    if (campo === 'email') {
      mensagem = validarEmail(campos.email.value);
      if (!mensagem && usuarios.some((usuario) => usuario.email === normalizarEmail(campos.email.value))) {
        mensagem = 'Este e-mail já tem um registro. Use outro.';
      }
    }
    mostrarErro(campo, mensagem);
    return !mensagem;
  }

  function atualizarForca() {
    const senha = campos.senha.value;
    const tamanho = [...senha].length;
    const variedade = [/[a-zá-ú]/, /[A-ZÁ-Ú]/, /\d/, /[^\p{L}\p{N}\s]/u]
      .filter((padrao) => padrao.test(senha)).length;
    const forca = !senha ? 'vazia' : tamanho < 8 || variedade < 2 ? 'fraca'
      : tamanho >= 12 && variedade >= 3 ? 'forte' : 'media';
    obter('forca-senha').dataset.forca = forca;
    obter('texto-forca').textContent = {
      vazia: 'A força aparece por aqui.', fraca: 'Força: fraca', media: 'Força: média', forte: 'Força: forte'
    }[forca];
  }

  function obterIniciais(nome) {
    const partes = nome.trim().split(/\s+/).filter(Boolean);
    return partes.length ? [partes[0], ...(partes.length > 1 ? [partes.at(-1)] : [])]
      .map((parte) => [...parte][0]).join('').toLocaleUpperCase('pt-BR') : 'SE';
  }

  function atualizarPrevia() {
    obter('preview-nome').textContent = campos.nome.value.trim() || 'Seu nome aqui';
    obter('preview-email').textContent = campos.email.value.trim() || 'seu@email.com';
    obter('preview-iniciais').textContent = obterIniciais(campos.nome.value);
    obter('preview-numero').textContent = String(usuarios.length + 1).padStart(4, '0');
  }

  function criarElemento(tag, classe, texto) {
    const elemento = document.createElement(tag);
    elemento.className = classe;
    elemento.textContent = texto;
    return elemento;
  }

  // Nunca interpreta nomes e e-mails como HTML, nem mostra hashes na lista.
  function renderizarUsuarios() {
    const fragmento = document.createDocumentFragment();
    [...usuarios].reverse().forEach((usuario) => {
      const item = criarElemento('li', 'registro-item', '');
      const dados = criarElemento('span', 'registro-dados', '');
      dados.append(criarElemento('span', 'registro-nome', usuario.nome),
        criarElemento('span', 'registro-email', usuario.email));
      const data = criarElemento('time', 'registro-data', dataCurta.format(new Date(usuario.criadoEm)));
      data.dateTime = usuario.criadoEm;
      item.append(criarElemento('span', 'registro-iniciais', obterIniciais(usuario.nome)), dados, data);
      fragmento.append(item);
    });
    obter('lista-usuarios').replaceChildren(fragmento);
    obter('lista-vazia').hidden = usuarios.length > 0;
    obter('contador-registros').textContent = String(usuarios.length);
    obter('total-cadastros').textContent = String(usuarios.length).padStart(2, '0');
    const ultimo = usuarios.at(-1);
    obter('ultimo-cadastro').textContent = ultimo ? ultimo.nome : 'O próximo pode ser você.';
    obter('data-ultimo-cadastro').textContent = ultimo ? dataCurta.format(new Date(ultimo.criadoEm)) : 'Caderno aberto, página em branco.';
    if (!concluido) obter('preview-numero').textContent = String(usuarios.length + 1).padStart(4, '0');
  }

  function atualizarRegistros() {
    try {
      usuarios = lerUsuarios();
      renderizarUsuarios();
      return true;
    } catch (erro) {
      obter('erro-geral').textContent = erro.message;
      obter('total-cadastros').textContent = '—';
      return false;
    }
  }

  async function gerarHash(senha) {
    if (!window.crypto?.subtle) {
      throw erroDeCadastro('Este navegador não oferece criptografia segura. Abra o arquivo em um navegador atualizado.');
    }
    const bytes = new TextEncoder().encode(senha);
    const hash = await crypto.subtle.digest('SHA-256', bytes);
    bytes.fill(0);
    return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  function gerarId() {
    return crypto.randomUUID ? crypto.randomUUID()
      : Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  async function salvarUsuario(usuario) {
    const gravar = () => {
      // Relê dentro da seção crítica: outra aba pode ter cadastrado este e-mail.
      const atuais = lerUsuarios();
      if (atuais.some((item) => item.email === usuario.email)) {
        throw erroDeCadastro('Este e-mail já tem um registro. Use outro.', 'email');
      }
      const novos = [...atuais, usuario];
      try {
        localStorage.setItem(CHAVE_USUARIOS, JSON.stringify(novos));
      } catch {
        throw erroDeCadastro('Não foi possível salvar. Libere espaço ou permita o armazenamento neste navegador.');
      }
      return novos;
    };
    // Web Locks coordena gravações simultâneas entre abas do mesmo navegador.
    if (!navigator.locks) return gravar();
    try {
      return await navigator.locks.request(CHAVE_USUARIOS, gravar);
    } catch (erro) {
      // Alguns navegadores expõem a API, mas não permitem Locks em arquivos locais.
      if (erro.name === 'SecurityError' || erro.name === 'NotSupportedError') return gravar();
      throw erro;
    }
  }

  function bloquearFormulario(bloquear) {
    Object.values(campos).forEach((campo) => { campo.disabled = bloquear; });
    alternarSenha.disabled = bloquear;
    botao.disabled = bloquear;
    formulario.setAttribute('aria-busy', String(enviando));
    obter('texto-botao').textContent = enviando ? 'Preparando seu registro…' : 'Criar meu registro';
  }

  function confirmarCadastro() {
    concluido = true;
    campos.senha.value = '';
    campos.senha.type = 'password';
    alternarSenha.setAttribute('aria-pressed', 'false');
    alternarSenha.setAttribute('aria-label', 'Mostrar senha');
    obter('texto-senha').textContent = 'Mostrar';
    atualizarForca();
    renderizarUsuarios();
    obter('preview-numero').textContent = String(usuarios.length).padStart(4, '0');
    obter('preview-status').textContent = 'Registro confirmado';
    obter('carimbo-cracha').hidden = false;
    obter('cracha').classList.add('carimbado');
    sucesso.hidden = false;
    obter('mensagem-sucesso').textContent = 'Cadastro realizado com sucesso';
    requestAnimationFrame(() => sucesso.classList.add('visivel'));
    obter('novo-cadastro').focus();
  }

  async function cadastrar(evento) {
    evento.preventDefault();
    if (enviando || concluido) return;
    obter('erro-geral').textContent = '';
    const registrosDisponiveis = atualizarRegistros();
    const invalidos = Object.keys(campos).filter((campo) => !validarCampo(campo));
    if (invalidos.length) {
      campos[invalidos[0]].focus();
      return;
    }
    if (!registrosDisponiveis) return;
    enviando = true;
    bloquearFormulario(true);
    try {
      const senhaHash = await gerarHash(campos.senha.value);
      usuarios = await salvarUsuario({
        id: gerarId(), nome: campos.nome.value.trim(), email: normalizarEmail(campos.email.value),
        senhaHash, criadoEm: new Date().toISOString()
      });
      confirmarCadastro();
    } catch (erro) {
      if (erro.campo) mostrarErro(erro.campo, erro.message);
      else obter('erro-geral').textContent = erro.message || 'Não foi possível concluir. Tente novamente.';
      enviando = false;
      bloquearFormulario(false);
      if (erro.campo) campos[erro.campo].focus();
    } finally {
      enviando = false;
      bloquearFormulario(concluido);
    }
  }

  function novoCadastro() {
    concluido = false;
    formulario.reset();
    sucesso.hidden = true;
    sucesso.classList.remove('visivel');
    obter('carimbo-cracha').hidden = true;
    obter('cracha').classList.remove('carimbado');
    obter('preview-status').textContent = 'Aguardando seu registro';
    obter('erro-geral').textContent = '';
    Object.keys(campos).forEach((campo) => mostrarErro(campo, ''));
    bloquearFormulario(false);
    atualizarPrevia();
    atualizarForca();
    campos.nome.focus();
  }

  Object.entries(campos).forEach(([nome, campo]) => {
    campo.addEventListener('input', () => {
      validarCampo(nome);
      atualizarPrevia();
      if (nome === 'senha') atualizarForca();
    });
    campo.addEventListener('blur', () => validarCampo(nome));
  });
  formulario.addEventListener('submit', cadastrar);
  obter('novo-cadastro').addEventListener('click', novoCadastro);
  alternarSenha.addEventListener('click', () => {
    const mostrar = campos.senha.type === 'password';
    campos.senha.type = mostrar ? 'text' : 'password';
    alternarSenha.setAttribute('aria-pressed', String(mostrar));
    alternarSenha.setAttribute('aria-label', mostrar ? 'Ocultar senha' : 'Mostrar senha');
    obter('texto-senha').textContent = mostrar ? 'Ocultar' : 'Mostrar';
  });
  obter('abrir-registros').addEventListener('click', () => {
    atualizarRegistros();
    painel.showModal();
  });
  obter('fechar-registros').addEventListener('click', () => painel.close());
  painel.addEventListener('close', () => obter('abrir-registros').focus());
  painel.addEventListener('click', (evento) => {
    const area = painel.getBoundingClientRect();
    if (evento.target === painel && (evento.clientX < area.left || evento.clientX > area.right ||
      evento.clientY < area.top || evento.clientY > area.bottom)) painel.close();
  });
  window.addEventListener('storage', (evento) => {
    if (evento.key === CHAVE_USUARIOS || evento.key === null) {
      atualizarRegistros();
      if (!concluido && campos.email.value) validarCampo('email');
    }
  });
  atualizarRegistros();
  atualizarPrevia();
  atualizarForca();
})();
