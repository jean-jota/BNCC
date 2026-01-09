const { GoogleGenerativeAI } = require('@google/generative-ai');

// Inicializa a API do Google Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Contexto BNCC Hardcoded - Diretrizes principais
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
  // Configura CORS para permitir requisições do frontend
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Responde a preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Apenas aceita requisições POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { tema, disciplina, ano, duracao } = req.body;

    // Validação dos dados recebidos
    if (!tema || !disciplina || !ano || !duracao) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    }

    // Configuração do modelo Gemini
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Construção do prompt com contexto BNCC
    const bnccContext = BNCC_CONTEXT[disciplina] ? 
      `Contexto BNCC para ${disciplina}:\n` + 
      JSON.stringify(BNCC_CONTEXT[disciplina], null, 2) + 
      `\n\nO ano informado é: ${ano}. Escolha o código BNCC apropriado.\n` : 
      `Disciplina: ${disciplina}. Use códigos BNCC apropriados para o ${ano}.\n`;

    const prompt = `${bnccContext}

Role: Você é um Especialista Pedagógico Brasileiro e Coordenador da BNCC.
Task: Crie um plano de aula técnico para um diário de classe oficial.

Dados da Aula:
- Tema: ${tema}
- Disciplina: ${disciplina}
- Ano/Série: ${ano}
- Duração: ${duracao}

Instruções de Segurança (Anti-Alucinação):
1. Consulte sua base de conhecimento interna sobre a BNCC.
2. Você deve citar o código alfanumérico CORRETO (ex: EF05MA03). Se houver dúvida, explique a competência sem inventar código.
3. O código deve ser compatível com o Ano/Série informado.

Estrutura de Saída Obrigatória (Use Markdown):
# Plano de Aula: ${tema}
**Código BNCC:** [Insira o Código Aqui]
**Competência Específica:** [Descrição da competência vinculada ao código]

## 1. Objetivos de Aprendizagem
- [Lista de objetivos claros]

## 2. Metodologia (Passo a Passo)
- **Introdução (15% do tempo):** [Como engajar os alunos]
- **Desenvolvimento (70% do tempo):** [Atividade prática e explanação]
- **Conclusão (15% do tempo):** [Verificação de aprendizado]

## 3. Recursos Necessários
- [Lista de materiais]

## 4. Avaliação
- [Como o professor avaliará se o aluno aprendeu]`;

    // Chama a API do Gemini
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const plano = response.text();

    // Retorna o plano gerado
    res.status(200).json({ plano });
  } catch (error) {
    console.error('Erro ao gerar plano de aula:', error);
    res.status(500).json({ error: 'Erro interno do servidor. Tente novamente mais tarde.' });
  }
};