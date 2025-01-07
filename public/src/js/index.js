document.addEventListener("DOMContentLoaded", function () {
    // Seleciona o botão do menu dropdown
    const dropBtn = document.querySelector(".dropbtn");
    const dropdownContent = document.querySelector(".dropdown-content");

    if (dropBtn && dropdownContent) {
        // Adiciona evento de clique ao botão
        dropBtn.addEventListener("click", function (e) {
            e.preventDefault(); // Evita comportamento padrão
            dropdownContent.classList.toggle("active"); // Alterna a visibilidade
        });

        // Fecha o dropdown ao clicar em um link
        const dropdownLinks = dropdownContent.querySelectorAll("a");
        dropdownLinks.forEach(link => {
            link.addEventListener("click", function () {
                dropdownContent.classList.remove("active"); // Fecha o menu
            });
        });
    } else {
        console.error("Botão ou conteúdo do dropdown não encontrado!");
    }
});
