import { List, ListItem, ListItemText, Paper } from '@mui/material';

interface TopicsListProps {
    topics: string[];
}

const TopicsList: React.FC<TopicsListProps> = ({ topics }) => {
    return (
        <List component={Paper}>
            {topics.map((topic, index) => (
                <ListItem key={index}>
                    <ListItemText primary={topic} />
                </ListItem>
            ))}
        </List>
    );
};

export default TopicsList;