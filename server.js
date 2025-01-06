const express = require('express');
const cors = require('cors');
const path = require('path'); 
const mongoose = require('mongoose');
const multer = require('multer'); // Biblioteca para upload de arquivos
const app = express();
const port = 3000;

// Middleware para processar JSON no corpo das requisições
app.use(express.json());
app.use(cors());

// Conectando ao MongoDB
mongoose.connect('mongodb+srv://taty:taty1234@cluster0.23kgy.mongodb.net/Portifolio-da-taty?retryWrites=true&w=majority&appName=Cluster0', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('Conectado ao MongoDB local'))
  .catch(err => console.error('Erro ao conectar ao MongoDB:', err));

// Configuração do multer para salvar imagens na pasta `uploads`
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Pasta onde as imagens serão salvas
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Nome único baseado na data
  },
});

const upload = multer({ storage });

// Middleware para servir arquivos estáticos (imagens)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const contentSchema = new mongoose.Schema({
  section: String, // Ex.: "gallery"
  title: String,
  description: String,
  images: [String], // URLs das imagens
});

const Content = mongoose.model('Content', contentSchema);

app.put('/content/gallery', upload.array('images'), async (req, res) => {
  try {
    console.log('Arquivos recebidos:', req.files); // Adiciona log para depurar

    const imageUrls = req.files.map(file => `/uploads/${file.filename}`);
    console.log('URLs das imagens:', imageUrls); // Loga os caminhos gerados

    const gallery = await Content.findOneAndUpdate(
      { section: 'gallery' },
      { $push: { images: { $each: imageUrls } } },
      { new: true, upsert: true }
    );

    res.json(gallery);
  } catch (error) {
    console.error('Erro ao adicionar imagens à galeria:', error);
    res.status(500).json({ message: 'Erro ao adicionar imagens à galeria' });
  }
});


app.put('/content/:section', async (req, res) => {
  const { section } = req.params;
  const { title, description } = req.body;

  try {
    const updatedContent = await Content.findOneAndUpdate(
      { section }, // Busca pelo nome da seção
      { title, description }, // Atualiza os campos
      { new: true, upsert: true } // Cria o documento se não existir
    );
    res.json(updatedContent);
  } catch (error) {
    console.error('Erro ao atualizar conteúdo da seção:', error);
    res.status(500).json({ message: 'Erro ao atualizar conteúdo da seção' });
  }
});

app.get('/content/:section', async (req, res) => {
  const { section } = req.params;
  try {
    const content = await Content.findOne({ section });
    if (!content) {
      return res.status(404).json({ message: 'Seção não encontrada' });
    }
    res.json(content);
  } catch (error) {
    console.error('Erro ao obter conteúdo da seção:', error);
    res.status(500).json({ message: 'Erro ao obter conteúdo da seção' });
  }
});

// Criar ou atualizar conteúdo de uma seção (ex.: "about")
app.put('/content/:section', async (req, res) => {
  const { section } = req.params;
  const { title, description } = req.body;

  try {
    const updatedContent = await Content.findOneAndUpdate(
      { section },
      { title, description },
      { new: true, upsert: true } // upsert: cria se não existir
    );
    res.json(updatedContent);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao atualizar conteúdo da seção' });
  }
});

// Obter conteúdo de uma seção
app.get('/content/:section', async (req, res) => {
  try {
    const content = await Content.findOne({ section: req.params.section });
    if (!content) {
      return res.status(404).json({ message: 'Seção não encontrada' });
    }
    res.json(content);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao obter conteúdo' });
  }
});


// Esquema para posts
const postSchema = new mongoose.Schema({
  title: String,
  content: String,
  imageUrl: String, // Campo para armazenar a URL da imagem
});

const Post = mongoose.model('Post', postSchema);

// API para obter os posts
app.get('/blog', async (req, res) => {
  try {
    const posts = await Post.find();
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao carregar posts' });
  }
});

// API para criar um post com imagem
app.post('/blog', upload.single('image'), async (req, res) => {
  const { title, content } = req.body; // Pegando título e conteúdo do corpo
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : undefined; // Cria a URL da imagem

  const post = new Post({
    title,
    content,
    imageUrl, // Salva a URL da imagem no banco
  });

  try {
    await post.save();
    res.status(201).json(post);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao criar post' });
  }
});

// API para atualizar um post (incluindo a imagem)
app.put('/blog/:id', upload.single('image'), async (req, res) => {
  const { title, content } = req.body; // Pegando título e conteúdo do corpo
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : undefined; // Cria a URL da imagem

  try {
    const post = await Post.findByIdAndUpdate(
      req.params.id,
      { title, content, imageUrl }, // Atualiza a URL da imagem se houver
      { new: true }
    );

    if (!post) {
      return res.status(404).json({ message: 'Post não encontrado' });
    }

    res.json(post); // Retorna o post atualizado com a nova imagem
  } catch (error) {
    res.status(500).json({ message: 'Erro ao editar post' });
  }
});


// API para deletar um post
app.delete('/blog/:id', async (req, res) => {
  try {
    const post = await Post.findByIdAndDelete(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post não encontrado' });
    }
    res.json({ message: 'Post excluído com sucesso' });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao excluir post' });
  }
});

// Serve arquivos estáticos como CSS, imagens e JS
app.use(express.static(path.join(__dirname, 'public')));

// Rota para a página inicial
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Inicia o servidor
app.listen(port, () => {
  console.log(`Servidor backend rodando em http://localhost:${port}`);
});
