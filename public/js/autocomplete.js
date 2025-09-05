// public/js/autocomplete.js

document.addEventListener('DOMContentLoaded', () => {
    const skillsInput = document.getElementById('skills-input');
    const skillsDropdownList = document.getElementById('skills-dropdown-list');
    const hiddenSkillsInput = document.getElementById('skills');
    const selectedSkillsContainer = document.createElement('div');
    selectedSkillsContainer.id = 'selected-skills-container';
    skillsInput.parentNode.insertBefore(selectedSkillsContainer, skillsInput.nextSibling);

    const availableSkills = [
        "JavaScript", "Python", "Java", "C++", "C#", "PHP", "Ruby", "Swift",
        "HTML", "CSS", "React", "Angular", "Vue.js", "Node.js", "Express.js",
        "Django", "Flask", "Spring", "Ruby on Rails", "MySQL", "PostgreSQL",
        "MongoDB", "SQL", "NoSQL", "Docker", "Kubernetes", "AWS", "Azure",
        "Git", "GitHub", "Jira", "Agile", "Scrum"
    ];

    let selectedSkills = hiddenSkillsInput.value ? hiddenSkillsInput.value.split(',') : [];

    function renderSelectedSkills() {
        selectedSkillsContainer.innerHTML = '';
        selectedSkills.forEach(skill => {
            if (skill.trim() !== '') {
                const skillTag = document.createElement('div');
                skillTag.classList.add('skill-tag');
                skillTag.textContent = skill.trim();

                const removeBtn = document.createElement('span');
                removeBtn.textContent = 'x';
                removeBtn.classList.add('remove-skill');
                removeBtn.addEventListener('click', () => {
                    selectedSkills = selectedSkills.filter(s => s !== skill);
                    hiddenSkillsInput.value = selectedSkills.join(',');
                    renderSelectedSkills();
                });

                skillTag.appendChild(removeBtn);
                selectedSkillsContainer.appendChild(skillTag);
            }
        });
    }

    skillsInput.addEventListener('input', (event) => {
        const query = event.target.value.toLowerCase();
        skillsDropdownList.innerHTML = '';

        if (query.length === 0) {
            return;
        }

        const filteredSkills = availableSkills.filter(skill => 
            skill.toLowerCase().includes(query) && !selectedSkills.includes(skill)
        );

        filteredSkills.forEach(skill => {
            const skillItem = document.createElement('div');
            skillItem.textContent = skill;
            skillItem.classList.add('autocomplete-item');

            skillItem.addEventListener('click', () => {
                if (!selectedSkills.includes(skill)) {
                    selectedSkills.push(skill);
                    hiddenSkillsInput.value = selectedSkills.join(',');
                    skillsInput.value = '';
                    skillsDropdownList.innerHTML = '';
                    renderSelectedSkills();
                }
            });
            skillsDropdownList.appendChild(skillItem);
        });
    });

    // Optional: Hide dropdown when clicking outside
    document.addEventListener('click', (event) => {
        if (!event.target.closest('#skills-input') && !event.target.closest('#skills-dropdown-list')) {
            skillsDropdownList.innerHTML = '';
        }
    });

    renderSelectedSkills();
});