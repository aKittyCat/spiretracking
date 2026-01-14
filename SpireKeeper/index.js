// --- ส่วนที่เพิ่ม: สร้าง Web Server เพื่อกันหลับ (Keep-Alive) ---
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Spire Bot is Online! 🤖');
});

app.listen(port, () => {
  console.log(`Keep-Alive Server listening on port ${port}`);
});
// -----------------------------------------------------------

require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { createClient } = require('@supabase/supabase-js');

// 1. Setup Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// 2. Setup Discord Client
const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

// Helper: Error Embed (Compact)
function createErrorEmbed(message) {
    return new EmbedBuilder()
        .setColor(0xef4444)
        .setDescription(`❌ **Error:** ${message}`);
}

// 3. Logic คำนวณเลเวล
function calculateLevelInfo(startLevel, totalPlayedHours) {
    const LEVEL_HOURS = [0, 0, 3.5, 10.5, 21, 35, 52.5, 73.5, 98, 126, 157.5, 192.5, 231, 273, 318.5, 367.5, 420, 476, 535.5, 598.5, 665, 735, 808.5, 885.5, 966, 1050, 1137.5, 1228.5, 1323, 1421, 1522.5, 0];
    
    const baseHours = LEVEL_HOURS[startLevel] || 0;
    const realTotalHours = baseHours + totalPlayedHours;

    let currentLevel = startLevel;
    for(let i = startLevel + 1; i <= 30; i++) { 
        if(realTotalHours >= LEVEL_HOURS[i]) {
            currentLevel = i; 
        } else {
            break; 
        }
    }
    
    let hoursToNext = 0;
    if (currentLevel < 30) {
        hoursToNext = LEVEL_HOURS[currentLevel + 1] - realTotalHours;
    }

    return { level: currentLevel, hoursToNext: Math.max(0, hoursToNext), totalHoursDisplay: realTotalHours };
}

// Helper: คำนวณ Tier จาก Level (เพิ่ม Tier 5)
function getTierFromLevel(level) {
    if (level >= 23) return "Tier 5"; // ⭐ เพิ่ม Tier 5
    if (level >= 17) return "Tier 4";
    if (level >= 11) return "Tier 3";
    if (level >= 5) return "Tier 2";
    return "Tier 1";
}

// 4. Register Slash Commands
const commands = [
    new SlashCommandBuilder()
        .setName('spire')
        .setDescription('เลือกตัวละครที่ต้องการเล่น')
        .addStringOption(option => option.setName('name').setDescription('ชื่อตัวละคร').setRequired(true))
        .addStringOption(option => option.setName('uuid').setDescription('รหัส UUID').setRequired(true)),
    new SlashCommandBuilder()
        .setName('spiregold')
        .setDescription('บันทึกทอง')
        .addNumberOption(option => option.setName('amount').setDescription('ใส่ตัวเลข (+ คือได้รับ / - คือจ่าย)').setRequired(true))
        .addStringOption(option => option.setName('desc').setDescription('คำอธิบาย').setRequired(false)),
    new SlashCommandBuilder()
        .setName('spirefavor')
        .setDescription('บันทึก Favor')
        .addIntegerOption(option => option.setName('amount').setDescription('ใส่ตัวเลข (+ คือได้รับ / - คือจ่าย)').setRequired(true))
        .addStringOption(option => option.setName('desc').setDescription('คำอธิบาย').setRequired(false)),
    new SlashCommandBuilder()
        .setName('spirecheck')
        .setDescription('เช็คสถานะตัวละคร'),
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
});

// 5. Handle Commands
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;
    const discordId = interaction.user.id;

    // --- Command: /spire (Login) ---
    if (commandName === 'spire') {
        const charName = interaction.options.getString('name');
        const uuid = interaction.options.getString('uuid');

        await interaction.deferReply();

        const { data: char, error } = await supabase
            .from('characters')
            .select('id, name')
            .eq('id', uuid)
            .single(); 

        if (error || !char) {
            return interaction.editReply({ embeds: [createErrorEmbed(`ไม่พบ UUID: \`${uuid}\``)] });
        }

        if (char.name.toLowerCase().trim() !== charName.toLowerCase().trim()) {
             return interaction.editReply({ embeds: [createErrorEmbed(`ชื่อไม่ตรงกับระบบ (${char.name})`)] });
        }

        const { error: upsertErr } = await supabase
            .from('discord_sessions')
            .upsert({ discord_id: discordId, character_id: char.id });

        if (upsertErr) return interaction.editReply({ embeds: [createErrorEmbed('บันทึก Session พลาด')] });

        // Compact Success Embed
        const embed = new EmbedBuilder()
            .setColor(0x10b981) // เขียว
            .setDescription(`✅ **เลือกตัวละคร:** ${char.name}`);

        return interaction.editReply({ embeds: [embed] });
    }

    // --- Middleware: Check Session ---
    if (['spiregold', 'spirefavor', 'spirecheck'].includes(commandName)) {
        const { data: session } = await supabase.from('discord_sessions').select('character_id').eq('discord_id', discordId).single();
        
        if (!session) {
            return interaction.reply({ embeds: [createErrorEmbed('กรุณาใช้ `/spire` เลือกตัวละครก่อน')], ephemeral: true });
        }
        
        const charId = session.character_id;

        // --- Command: /spiregold ---
        if (commandName === 'spiregold') {
            await interaction.deferReply();
            const amount = interaction.options.getNumber('amount');
            
            const defaultDesc = amount >= 0 ? 'ได้รับทอง' : 'ใช้จ่ายทอง';
            const desc = interaction.options.getString('desc') || defaultDesc;

            const { data: charData } = await supabase.from('characters').select('user_id').eq('id', charId).single();
            
            const { error } = await supabase.from('gold_logs').insert({
                character_id: charId,
                user_id: charData.user_id, 
                amount: amount,
                description: desc + ' (Bot)'
            });

            if (error) return interaction.editReply({ embeds: [createErrorEmbed(error.message)] });

            // ดึงยอดล่าสุด
            const { data: stats } = await supabase.rpc('get_character_stats', { target_user_id: charData.user_id });
            const charStats = stats.find(c => c.id === charId);
            const totalGold = charStats ? Number(charStats.total_gold).toLocaleString() : '0';
            
            const changeText = amount >= 0 ? `+${amount.toLocaleString()}` : `${amount.toLocaleString()}`;

            // Compact Gold Embed
            const embed = new EmbedBuilder()
                .setColor(0xf59e0b) // ทอง
                .setDescription(`💰 **${changeText} GP** | ${desc}`)
                .setFooter({ text: `ยอดคงเหลือ: ${totalGold} GP` });

            return interaction.editReply({ embeds: [embed] });
        }

        // --- Command: /spirefavor ---
        if (commandName === 'spirefavor') {
            await interaction.deferReply();
            const amount = interaction.options.getInteger('amount');
            
            const defaultDesc = amount >= 0 ? 'ได้รับ Favor' : 'ใช้ Favor';
            const desc = interaction.options.getString('desc') || defaultDesc;

            const { data: charData } = await supabase.from('characters').select('user_id').eq('id', charId).single();

            const { error } = await supabase.from('favor_logs').insert({
                character_id: charId,
                user_id: charData.user_id,
                amount: amount,
                description: desc + ' (Bot)'
            });

            if (error) return interaction.editReply({ embeds: [createErrorEmbed(error.message)] });

            const { data: stats } = await supabase.rpc('get_character_stats', { target_user_id: charData.user_id });
            const charStats = stats.find(c => c.id === charId);
            const totalFavor = charStats ? Number(charStats.total_favor).toLocaleString() : '0';
            
            const changeText = amount >= 0 ? `+${amount.toLocaleString()}` : `${amount.toLocaleString()}`;

            // Compact Favor Embed
            const embed = new EmbedBuilder()
                .setColor(0xc084fc) // ม่วง
                .setDescription(`✨ **${changeText} Favor** | ${desc}`)
                .setFooter({ text: `ยอดคงเหลือ: ${totalFavor} Favor` });

            return interaction.editReply({ embeds: [embed] });
        }

        // --- Command: /spirecheck ---
        if (commandName === 'spirecheck') {
            await interaction.deferReply();
            
            const { data: charBasic } = await supabase.from('characters').select('user_id').eq('id', charId).single();
            const { data: stats } = await supabase.rpc('get_character_stats', { target_user_id: charBasic.user_id });
            const charStats = stats.find(c => c.id === charId);

            if (!charStats) return interaction.editReply({ embeds: [createErrorEmbed('ไม่พบข้อมูลตัวละคร')] });

            const startLevel = charStats.level || 1;
            const totalPlayedHours = (Number(charStats.total_sessions_hours) || 0) + (Number(charStats.total_dm_hours) || 0);
            const levelInfo = calculateLevelInfo(startLevel, totalPlayedHours);
            const nextLvText = levelInfo.level >= 30 ? 'MAX' : `${levelInfo.hoursToNext.toFixed(2)}h`;
            
            const tier = getTierFromLevel(levelInfo.level);

            // Compact Status Embed
            const embed = new EmbedBuilder()
                .setColor(0x0ea5e9) // ฟ้า
                .setTitle(`📜 สถานะ: ${charStats.name} (${tier})`)
                .addFields(
                    { name: 'Level Info', value: `Lv: **${levelInfo.level}**\nTime: **${levelInfo.totalHoursDisplay.toFixed(2)}h**\nNext: **${nextLvText}**`, inline: true },
                    { name: 'Coin Purse', value: `💰 **${Number(charStats.total_gold).toLocaleString()}** GP\n✨ **${Number(charStats.total_favor).toLocaleString()}** Favor`, inline: true },
                    { name: 'Details', value: `🐾 Pets: ${charStats.pets || '-'}\n⚖️ Align: ${charStats.alignment || '-'}`, inline: false }
                );

            return interaction.editReply({ embeds: [embed] });
        }
    }
});

client.login(process.env.DISCORD_TOKEN);