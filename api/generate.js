const { GoogleGenerativeAI } = require('@google/generative-ai');

// --- 1. CONTEXTO BNCC (Mantivemos o seu, que está excelente) ---
const BNCC_CONTEXT = {
  "Matemática": {
    "Ensino Fundamental - Anos Iniciais (1º-5º)": {
      "competências": [
        "Utilizar diferentes representações para comunicar ideias matemáticas",
        "Resolver problemas em contextos diversos",
        "Desenvolver o raciocínio lógico e espacial"
      ],
      "códigos_exemplos": ["EF01MA01", "EF02MA03", "EF03MA05", "EF04MA10", "EF05MA08"]
    },
    "Ensino Fundamental - Anos Finais (6º-9º)": {
      "competências": [
        "Compreender conceitos algébricos e geométricos",
        "Analisar dados e probabilidade",
        "Aplicar matemática em situações reais"
      ],
      "códigos_exemplos": ["EF06MA01", "EF07MA13", "EF08MA07", "EF09MA04"]
    },
    "Ensino Médio": {
      "competências": [
        "Resolver problemas complexos com múltiplas variáveis",
        "Aplicar conceitos de cálculo e análise",
        "Utilizar matemática em contextos científicos e tecnológicos"
      ],
      "códigos_exemplos": ["EM13MAT101", "EM13MAT202", "EM13MAT305"]
    }
  },
  "Língua Portuguesa": {
    "Ensino Fundamental - Anos Iniciais (1º-5º)": {
      "competências": [
        "Desenvolver habilidades de leitura e escrita",
        "Compreender textos orais e escritos",
        "Produzir textos em diferentes gêneros"
      ],
      "códigos_exemplos": ["EF01LP01", "EF02LP09", "EF03LP16", "EF04LP21", "EF05LP26"]
    },
    "Ensino Fundamental - Anos Finais (6º-9º)": {
      "competências": [
        "Analisar textos críticos e literários",
        "Produzir textos argumentativos",
        "Dominar convenções da norma padrão"
      ],
      "códigos_exemplos": ["EF06LP01", "EF07LP11", "EF08LP16", "EF09LP21"]
    },
    "Ensino Médio": {
      "competências": [
        "Analisar textos complexos e intertextuais",
        "Produzir textos técnicos e acadêmicos",
        "Dominar variações linguísticas"
      ],
      "códigos_exemplos": ["EM13LP01", "EM13LP12", "EM13LP23"]
    }
  },
  "Ciências": {
    "Ensino Fundamental - Anos Iniciais (1º-5º)": {
      "competências": [
        "Compreender fenômenos naturais básicos",
        "Desenvolver pensamento científico inicial",
        "Reconhecer a relação homem-natureza"
      ],
      "códigos_exemplos": ["EF01CI01", "EF02CI05", "EF03CI08", "EF04CI12", "EF05CI16"]
    },
    "Ensino Fundamental - Anos Finais (6º-9º)": {
      "competências": [
        "Compreender sistemas e processos biológicos",
        "Analisar transformações químicas e físicas",
        "Aplicar método científico"
      ],
      "códigos_exemplos": ["EF06CI01", "EF07CI09", "EF08CI14", "EF09CI18"]
    },
    "Ensino Médio": {
      "competências": [
        "Analisar sistemas complexos e interações",
        "Compreender princípios da física moderna",
        "Aplicar conhecimentos em soluções tecnológicas"
      ],
      "códigos_exemplos": ["EM13CNT101", "EM13CNT202", "EM13CNT303"]
    }
  }
};

module.exports = async (req, res) => {
  // --- 2. CONFIGURAÇÃO DE SEGURANÇA E CORS ---
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { tema, disciplina, ano, duracao } = req.body || {};

    if (!tema) {
      return res.status(400).json({ error: 'O tema da aula é obrigatório.' });
    }

    // --- 3. SISTEMA DE FALLBACK DE MODELOS (O SEGREDO DO SUCESSO) ---
    // Se o primeiro falhar (404), ele tenta o próximo automaticamente.
    const modelsToTry = [
        "gemini-1.5-flash",
        "gemini-1.5-flash-001",
        "gemini-1.5-pro",
        "gemini-pro" // Este é o mais antigo e estável, nosso "pneu estepe"
    ];

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // Preparação do Prompt com seu Contexto BNCC
    const bnccContext = BNCC_CONTEXT[disciplina] ? 
      `Contexto BNCC para ${disciplina}:\n` + 
      JSON.stringify(BNCC_CONTEXT[disciplina], null, 2) + 
      `\n\nO ano informado é: ${ano}. Escolha o código BNCC apropriado.\n` : 
      `Disciplina: ${disciplina}. Use códigos BNCC apropriados para o ${ano}.\n`;

    const fullPrompt = `${bnccContext}

Role: Você é um Especialista Pedagógico Brasileiro e Coordenador da BNCC.
Task: Crie um plano de aula técnico para um diário de classe oficial.

Dados da Aula:
- Tema: ${tema}
- Disciplina: ${disciplina}
- Ano/Série: ${ano}
- Duração: ${duracao}

Instruções de Segurança:
1. Consulte sua base de conhecimento interna sobre a BNCC.
2. Cite o código alfanumérico CORRETO.
3. Use Markdown.

Estrutura de Saída Obrigatória:
# Plano de Aula: ${tema}
**Código BNCC:** [Código]
**Competência:** [Descrição]

## 1. Objetivos
- [Lista]

## 2. Metodologia
- [Passo a passo]

## 3. Avaliação
- [Método]`;

    let textResponse = null;
    let lastError = null;

    // Loop de Tentativa
    for (const modelName of modelsToTry) {
        try {
            console.log(`Tentando gerar com modelo: ${modelName}...`);
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent(fullPrompt);
            const response = await result.response;
            textResponse = response.text();
            
            // Se funcionou, para o loop e segue a vida
            break; 
        } catch (error) {
            console.warn(`Falha no modelo ${modelName}:`, error.message);
            lastError = error;
            // Continua para o próximo da lista...
        }
    }

    if (!textResponse) {
        throw new Error(`Todos os modelos falharam. Erro final: ${lastError?.message}`);
    }

    // Retorna para o frontend (padronizado como 'result' ou 'plano')
    // Enviamos nas duas chaves para garantir que seu frontend entenda
    res.status(200).json({ result: textResponse, plano: textResponse });

  } catch (error) {
    console.error('Erro fatal:', error);
    res.status(500).json({ error: 'Erro interno ao processar plano.' });
  }
};
